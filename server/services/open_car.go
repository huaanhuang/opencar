package services

import (
	"encoding/json"
	"errors"
	"fmt"
	"github.com/huaanhuang/opencar/utils/helper"
	"github.com/huaanhuang/opencar/utils/log"
	"sync"
)

type Identity string

type Command string

type Message struct {
	Cmd  Command     `json:"cmd"`
	From Identity    `json:"from"`
	To   Identity    `json:"to"`
	Data interface{} `json:"data"`
}

const (
	OfferIdentity      Identity = "OFFER"      // 提议者身份
	AnswerIdentity     Identity = "ANSWER"     // 应答者身份
	ControllerIdentity Identity = "CONTROLLER" // 控制器身份
	JoinCmd            Command  = "JOIN"       // 加入消息
	OfferCmd           Command  = "OFFER"      // offer消息
	AnswerCmd          Command  = "ANSWER"     // answer消息
	CandidateCmd       Command  = "CANDIDATE"  // candidate消息
	LeaveCmd           Command  = "LEAVE"      // 退出消息
	ControllerCmd      Command  = "CONTROLLER" // 控制消息
	MonitorCmd         Command  = "MONITOR"    // 监控消息
	RunInfoCmd         Command  = "RUN_INFO"   // 运行时信息
	ErrorCmd           Command  = "ERROR"      // 异常消息
)

var Identities = []Identity{OfferIdentity, AnswerIdentity, ControllerIdentity}

func NewOpenCar() OpenCar {
	return &openCar{
		users: make(map[Identity]*WebSocketConn),
	}
}

type OpenCar interface {
	HandleMessage(identity Identity, conn *WebSocketConn)
	Peek(identity Identity) error
}

type openCar struct {
	users map[Identity]*WebSocketConn
	mu    sync.RWMutex
}

func (obj *openCar) getConnByIdentity(identity Identity) (*WebSocketConn, error) {
	obj.mu.RLock()
	defer obj.mu.RUnlock()
	if conn, ok := obj.users[identity]; ok {
		return conn, nil
	}
	return nil, errors.New(fmt.Sprintf("身份[%s]未连接", identity))
}

// Peek 检查连接是否已经存在
func (obj *openCar) Peek(identity Identity) error {
	obj.mu.RLock()
	defer obj.mu.RUnlock()
	if !helper.InArray(identity, Identities) {
		return errors.New(fmt.Sprintf("身份[%s]不正确", identity))
	}
	if conn, ok := obj.users[identity]; ok && !conn.closed {
		return errors.New(fmt.Sprintf("身份[%s]已存在", identity))
	}
	return nil
}

func (obj *openCar) HandleMessage(identity Identity, conn *WebSocketConn) {
	obj.mu.Lock()
	obj.users[identity] = conn
	obj.mu.Unlock()
	//监听消息事件
	conn.On("message", func(message []byte) {
		log.Debugf("收到消息: %s", string(message))
		//解析Json数据
		msg := &Message{}
		err := json.Unmarshal(message, &msg)
		if err != nil {
			obj.onError(conn, identity, fmt.Sprintf("解析Message错误: %s", err.Error()))
			return
		}
		switch msg.Cmd {
		case OfferCmd:
			obj.handleOfferCmd(conn, identity, string(message))
		case AnswerCmd:
			obj.handleAnswerCmd(conn, identity, string(message))
		case CandidateCmd:
			obj.handleCandidateCmd(conn, identity, string(message))
		case LeaveCmd:
			obj.handleLeaveCmd(conn, identity, string(message))
		case ControllerCmd:
			obj.handleControllerCmd(conn, identity, string(message))
		case MonitorCmd, RunInfoCmd:
			obj.handleMonitorCmd(conn, identity, string(message))
		default:
			info := fmt.Sprintf("未知命令: %s", msg.Cmd)
			obj.onError(conn, identity, info)
		}
	})

	//连接关闭事件处理
	conn.On("close", func(code int, text string) {
		obj.mu.Lock()
		defer obj.mu.Unlock()
		conn.socket.Close()
		delete(obj.users, identity)
		// 广播close事件
		for id, conn := range obj.users {
			msg := Message{
				Cmd:  LeaveCmd,
				From: identity,
				To:   id,
				Data: "",
			}
			marshal, err := json.Marshal(msg)
			if err != nil {
				log.Errorf("onJoin Marshal 错误: %s", err.Error())
				return
			}
			err = conn.Send(string(marshal))
			if err != nil {
				log.Errorf("onJoin Send 错误: %s", err.Error())
				return
			}
		}
	})

	// 广播Join消息
	obj.onJoin(identity)
}

// onError 发送异常信息
func (obj *openCar) onError(self *WebSocketConn, identity Identity, info string) {
	log.Errorf("OnError: %s", info)
	msg := Message{
		Cmd:  ErrorCmd,
		From: identity,
		To:   identity,
		Data: info,
	}
	marshal, err := json.Marshal(msg)
	if err != nil {
		log.Errorf("OnError Marshal 错误: %s", err.Error())
		return
	}
	err = self.Send(string(marshal))
	if err != nil {
		log.Errorf("OnError Send 错误: %s", err.Error())
		return
	}
}

// onJoin 广播JOIN消息
func (obj *openCar) onJoin(identity Identity) {
	obj.mu.RLock()
	defer obj.mu.RUnlock()
	ids := make([]Identity, 0)
	for id, _ := range obj.users {
		ids = append(ids, id)
	}
	for id, conn := range obj.users {
		msg := Message{
			Cmd:  JoinCmd,
			From: identity,
			To:   id,
			Data: ids,
		}
		marshal, err := json.Marshal(msg)
		if err != nil {
			log.Errorf("onJoin Marshal 错误: %s", err.Error())
			return
		}
		err = conn.Send(string(marshal))
		if err != nil {
			log.Errorf("onJoin Send 错误: %s", err.Error())
			return
		}
	}
}

// handleOfferCmd 转发提议者sdp给应答者
func (obj *openCar) handleOfferCmd(self *WebSocketConn, identity Identity, msg string) {
	answer, err := obj.getConnByIdentity(AnswerIdentity)
	if err != nil {
		obj.onError(self, identity, err.Error())
		return
	}
	err = answer.Send(msg)
	if err != nil {
		obj.onError(self, identity, err.Error())
		return
	}
}

// handleAnswerCmd 转发应答者sdp到提议者
func (obj *openCar) handleAnswerCmd(self *WebSocketConn, identity Identity, msg string) {
	offer, err := obj.getConnByIdentity(OfferIdentity)
	if err != nil {
		obj.onError(self, identity, err.Error())
		return
	}
	err = offer.Send(msg)
	if err != nil {
		obj.onError(self, identity, err.Error())
		return
	}
}

// handleCandidateCmd 转发提议者和应答者Candidate信息
func (obj *openCar) handleCandidateCmd(self *WebSocketConn, identity Identity, msg string) {
	oppositeEndIdentity := OfferIdentity
	if identity == OfferIdentity {
		oppositeEndIdentity = AnswerIdentity
	}
	oppositeEnd, err := obj.getConnByIdentity(oppositeEndIdentity)
	if err != nil {
		obj.onError(self, identity, err.Error())
		return
	}
	err = oppositeEnd.Send(msg)
	if err != nil {
		obj.onError(self, identity, err.Error())
		return
	}
}

// handleLeaveCmd 广播离开消息
func (obj *openCar) handleLeaveCmd(self *WebSocketConn, identity Identity, msg string) {
	for id, conn := range obj.users {
		if id != identity {
			err := conn.Send(msg)
			if err != nil {
				log.Errorf("onJoin Send 错误: %s", err.Error())
				return
			}
		}
	}
}

func (obj *openCar) handleControllerCmd(self *WebSocketConn, identity Identity, msg string) {
	oppositeEndIdentity := OfferIdentity
	if identity == OfferIdentity {
		oppositeEndIdentity = AnswerIdentity
	}
	oppositeEnd, err := obj.getConnByIdentity(oppositeEndIdentity)
	if err != nil {
		obj.onError(self, identity, err.Error())
		return
	}
	err = oppositeEnd.Send(msg)
	if err != nil {
		obj.onError(self, identity, err.Error())
		return
	}
}

func (obj *openCar) handleMonitorCmd(self *WebSocketConn, identity Identity, msg string) {
	offer, err := obj.getConnByIdentity(OfferIdentity)
	if err != nil {
		log.Warningf("offer不在线，忽略监控消息")
		return
	}
	err = offer.Send(msg)
	if err != nil {
		obj.onError(self, identity, err.Error())
		return
	}
}
