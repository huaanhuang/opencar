package services

import (
	"encoding/json"
	"errors"
	"github.com/chuckpreslar/emission"
	"github.com/gorilla/websocket"
	"github.com/huaanhuang/opencar/utils/log"
	"net"
	"net/http"
	"strings"
	"sync"
	"time"
)

const (
	JoinRoom       = "joinRoom"       //加入房间
	Offer          = "offer"          //Offer消息
	Answer         = "answer"         //Answer消息
	Candidate      = "candidate"      //Candidate消息
	HangUp         = "hangUp"         //挂断
	LeaveRoom      = "leaveRoom"      //离开房间
	UpdateUserList = "updateUserList" //更新房间用户列表
	Controller     = "controller"     // 控制指令
	pingPeriod     = 30 * time.Second
)

// NewRoom 实例化房间对象
func NewRoom(id string) *Room {
	var room = &Room{
		users:    make(map[string]User),
		sessions: make(map[string]Session),
		ID:       id,
	}
	return room
}

// NewRoomManager 实例化房间管理对象
func NewRoomManager() *RoomManager {
	var roomManager = &RoomManager{
		rooms: make(map[string]*Room),
	}
	return roomManager
}

// UserInfo 用户信息
type UserInfo struct {
	ID       string `json:"id"`       //Id
	Name     string `json:"name"`     //名称
	Identity string `json:"identity"` // 身份
}

// User 用户
type User struct {
	info UserInfo       //用户信息
	conn *WebSocketConn //连接对象
}

// Session 会话信息
type Session struct {
	id   string //会话id
	from User   //消息来源
	to   User   //消息要发送的目标
}

// Room 定义房间
type Room struct {
	users    map[string]User    //所有用户
	sessions map[string]Session //所有会话
	ID       string             // 房间号
}

// RoomManager 房间管理对象
type RoomManager struct {
	rooms map[string]*Room
}

// 获取房间
func (obj *RoomManager) getRoom(id string) *Room {
	return obj.rooms[id]
}

// 创建房间
func (obj *RoomManager) createRoom(id string) *Room {
	obj.rooms[id] = NewRoom(id)
	return obj.rooms[id]
}

// 删除房间
func (obj *RoomManager) deleteRoom(id string) {
	delete(obj.rooms, id)
}

// HandleNewWebSocket 消息处理
func (obj *RoomManager) HandleNewWebSocket(conn *WebSocketConn, request *http.Request) {
	log.Infof("On Open %v", request)
	//监听消息事件
	conn.On("message", func(message []byte) {
		//解析Json数据
		msg := make(map[string]interface{})
		err := json.Unmarshal(message, &msg)
		if err != nil {
			log.Errorf("解析Json数据Unmarshal错误 %v", err)
			return
		}
		//定义数据
		var data map[string]interface{}
		//拿到具体数据

		if tmp, ok := msg["data"]; ok {
			data = tmp.(map[string]interface{})
		} else {
			log.Errorf("没有发现数据!")
			return
		}

		roomId := data["roomId"].(string)
		log.Infof("房间Id: %v", roomId)

		//根据roomId获取房间
		room := obj.getRoom(roomId)
		//查询不到房间则创建一个房间
		if room == nil {
			room = obj.createRoom(roomId)
		}

		//判断消息类型
		switch msg["type"] {
		case Controller:
			if from, ok := data["from"]; ok {
				onController(conn, string(message), from.(string), room, obj)
			}
			break
		case JoinRoom:
			onJoinRoom(conn, data, room, obj)
			break
		//提议Offer消息
		case Offer:
			//直接执行下一个case并转发消息
			fallthrough
		//应答Answer消息
		case Answer:
			//直接执行下一个case并转发消息
			fallthrough
		//网络信息Candidate
		case Candidate:
			onCandidate(conn, data, room, obj, msg)
			break
		//挂断消息
		case HangUp:
			onHangUp(conn, data, room, obj, msg)
			break
		default:
			log.Warningf("未知的请求 %v", msg)
			break
		}
	})

	//连接关闭事件处理
	conn.On("close", func(code int, text string) {
		onClose(conn, obj)
	})
}

// 通知所有的用户更新
func (obj *RoomManager) notifyUsersUpdate(conn *WebSocketConn, users map[string]User) {
	//更新信息
	infos := make([]UserInfo, 0)
	//迭代所有的User
	for _, userClient := range users {
		//添加至数组里
		infos = append(infos, userClient.info)
	}
	//创建发送消息数据结构
	msg := make(map[string]interface{})
	//消息类型
	msg["type"] = UpdateUserList
	//数据
	msg["data"] = infos
	//迭代所有的User
	for _, user := range users {
		//将Json数据发送给每一个User
		marshal, err := json.Marshal(msg)
		if err != nil {
			log.Errorf("notifyUsersUpdate Marshal Err: %s", err.Error())
			return
		}
		user.conn.Send(string(marshal))
	}
}

func onController(conn *WebSocketConn, message string, from string, room *Room, roomManager *RoomManager) {
	for id, user := range room.users {
		if id != from {
			user.conn.Send(message)
		}
	}
}

func onJoinRoom(conn *WebSocketConn, data map[string]interface{}, room *Room, roomManager *RoomManager) {
	//创建一个User
	user := User{
		//连接
		conn: conn,
		//User信息
		info: UserInfo{
			ID:       data["id"].(string),       //ID值
			Name:     data["name"].(string),     //名称
			Identity: data["identity"].(string), //身份
		},
	}
	//把User放入数组里
	room.users[user.info.ID] = user
	//通知所有的User更新
	roomManager.notifyUsersUpdate(conn, room.users)
}

// offer/answer/candidate消息处理
func onCandidate(conn *WebSocketConn, data map[string]interface{}, room *Room, roomManager *RoomManager, request map[string]interface{}) {
	//读取目标to属性值
	to := data["to"].(string)
	//查找User对象
	if user, ok := room.users[to]; !ok {
		log.Errorf("没有发现用户[" + to + "]")
		return
	} else {
		//发送信息给目标User
		marshal, err := json.Marshal(request)
		if err != nil {
			log.Errorf("onCandidate Marshal Err: %s", err.Error())
			return
		}
		user.conn.Send(string(marshal))
	}
}

func onHangUp(conn *WebSocketConn, data map[string]interface{}, room *Room, roomManager *RoomManager, request map[string]interface{}) {
	//拿到sessionId属性值,并转换成字符串
	sessionID := data["sessionId"].(string)
	//使用-分割字符串
	ids := strings.Split(sessionID, "-")

	//根据Id查找User
	if user, ok := room.users[ids[0]]; !ok {
		log.Warningf("用户 [" + ids[0] + "] 没有找到")
		return
	} else {
		//挂断消息
		hangUp := map[string]interface{}{
			//消息类型
			"type": HangUp,
			//数据
			"data": map[string]interface{}{
				//0表示自己 1表示对方
				"to": ids[0],
				//会话Id
				"sessionId": sessionID,
			},
		}
		//发送信息给目标User,即自己[0]
		marshal, err := json.Marshal(hangUp)
		if err != nil {
			log.Errorf("onHangUp Marshal Err: %s", err.Error())
			return
		}
		user.conn.Send(string(marshal))
	}

	//根据Id查找User
	if user, ok := room.users[ids[1]]; !ok {
		log.Warning("用户 [" + ids[1] + "] 没有找到")
		return
	} else {
		//挂断消息
		hangUp := map[string]interface{}{
			//消息类型
			"type": HangUp,
			//数据
			"data": map[string]interface{}{
				//0表示自己  1表示对方
				"to": ids[1],
				//会话Id
				"sessionId": sessionID,
			},
		}
		//发送信息给目标User,即对方[1]
		marshal, err := json.Marshal(hangUp)
		if err != nil {
			log.Errorf("onHangUp Marshal Err2: %s", err.Error())
			return
		}
		user.conn.Send(string(marshal))
	}
}

func onClose(conn *WebSocketConn, roomManager *RoomManager) {
	log.Infof("连接关闭 %v", conn)
	var userId string = ""
	var roomId string = ""

	//遍历所有的房间找到退出的用户
	for _, room := range roomManager.rooms {
		for _, user := range room.users {
			//判断是不是当前连接对象
			if user.conn == conn {
				userId = user.info.ID
				roomId = room.ID
				break
			}
		}
	}

	if roomId == "" {
		log.Errorf("没有查找到退出的房间及用户")
		return
	}

	log.Infof("退出的用户roomId %v userId %v", roomId, userId)

	//循环遍历所有的User
	for _, user := range roomManager.getRoom(roomId).users {
		//判断是不是当前连接对象
		if user.conn != conn {
			leave := map[string]interface{}{
				"type": LeaveRoom,
				"data": userId,
			}
			marshal, err := json.Marshal(leave)
			if err != nil {
				log.Errorf("onClose Marshal Err: %s", err.Error())
				return
			}
			user.conn.Send(string(marshal))
		}
	}
	log.Infof("删除User", userId)
	//根据Id删除User
	delete(roomManager.getRoom(roomId).users, userId)

	//通知所有的User更新数据
	roomManager.notifyUsersUpdate(conn, roomManager.getRoom(roomId).users)
}

// WebSocketConn 定义WebSocket连接
type WebSocketConn struct {
	//事件派发器
	emission.Emitter
	//socket连接
	socket *websocket.Conn
	//互斥锁
	mutex *sync.Mutex
	//是否关闭
	closed bool
}

// NewWebSocketConn 实例化WebSocket连接
func NewWebSocketConn(socket *websocket.Conn) *WebSocketConn {
	//定义连接变量
	var conn WebSocketConn
	//实例化事件触发器
	conn.Emitter = *emission.NewEmitter()
	//socket连接
	conn.socket = socket
	//实例化互斥锁
	conn.mutex = new(sync.Mutex)
	//打开状态
	conn.closed = false
	//socket连接关闭回调函数
	conn.socket.SetCloseHandler(func(code int, text string) error {
		//输出日志
		log.Warningf("%s [%d]", text, code)
		//派发关闭事件
		conn.Emit("close", code, text)
		//设置为关闭状态
		conn.closed = true
		return nil
	})
	//返回连接
	return &conn
}

// ReadMessage 读取消息
func (conn *WebSocketConn) ReadMessage() {
	//创建一个读取消息的通道
	in := make(chan []byte)
	//创建一个通道关闭使用
	stop := make(chan struct{})
	//实例化一个Ping对象
	pingTicker := time.NewTicker(pingPeriod)

	//获取到socket对象
	var c = conn.socket
	go func() {
		for {
			//读取socket数据
			_, message, err := c.ReadMessage()
			//错误处理
			if err != nil {
				//输出日志
				log.Warningf("获取到错误: %v", err)
				//关闭错误
				if c, k := err.(*websocket.CloseError); k {
					//派发关闭事件
					conn.Emit("close", c.Code, c.Text)
				} else {
					//读写错误
					if c, k := err.(*net.OpError); k {
						//派发关闭事件
						conn.Emit("close", 1008, c.Error())
					}
				}
				//关闭通道
				close(stop)
				break
			}
			//将消息放入通道里
			in <- message
		}
	}()

	//循环接收通道数据
	for {
		select {
		case _ = <-pingTicker.C:
			//log.Infof("发送心跳包...")
			//发送空包
			heartPackage := map[string]interface{}{
				//消息类型
				"type": "heartPackage",
				//空数据包
				"data": "",
			}
			//发送心跳包给当前发送消息的Peer
			marshal, err := json.Marshal(heartPackage)
			if err != nil {
				log.Errorf("heartPackage Marshal Err: %s", err.Error())
				//停止
				pingTicker.Stop()
				return
			}
			err = conn.Send(string(marshal))
			if err != nil {
				log.Errorf("发送心跳包错误: %s", err.Error())
				//停止
				pingTicker.Stop()
				return
			}
		//使用通道接收数据
		case message := <-in:
			log.Infof("接收到的数据: %s", message)
			//将接收到的数据派发出去,消息类型为message
			conn.Emit("message", []byte(message))
		case <-stop:
			return
		}
	}
}

// Send 发送消息
func (conn *WebSocketConn) Send(message string) error {
	if !strings.Contains(message, "heartPackage") {
		log.Infof("发送数据: %s", message)
	}
	//连接加锁
	conn.mutex.Lock()
	//延迟执行连接解锁
	defer conn.mutex.Unlock()
	//判断连接是否关闭
	if conn.closed {
		return errors.New("websocket: write closed")
	}
	//发送消息
	return conn.socket.WriteMessage(websocket.TextMessage, []byte(message))
}

// Close 关闭WebSocket连接
func (conn *WebSocketConn) Close() {
	//连接加锁
	conn.mutex.Lock()
	//延迟执行连接解锁
	defer conn.mutex.Unlock()
	if conn.closed == false {
		log.Infof("关闭WebSocket连接 : ", conn)
		//关闭WebSocket连接
		conn.socket.Close()
		//设置关闭状态为true
		conn.closed = true
	} else {
		log.Warningf("连接已关闭 :", conn)
	}
}
