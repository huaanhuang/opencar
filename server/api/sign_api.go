package api

import (
	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	"github.com/huaanhuang/opencar/services"
	"github.com/huaanhuang/opencar/utils/log"
	"net/http"
)

func NewSignApi() SingApi {
	a := &signApi{
		upgrade: websocket.Upgrader{
			ReadBufferSize:  1024,
			WriteBufferSize: 1024,
			// 允许所有CORS请求
			CheckOrigin: func(r *http.Request) bool {
				return true
			},
		},
		roomManager: services.NewRoomManager(),
		openCar:     services.NewOpenCar(),
	}
	return a
}

type SingApi interface {
	WsHandler(c *gin.Context)
	OpenCar(c *gin.Context)
}

type signApi struct {
	upgrade     websocket.Upgrader
	roomManager *services.RoomManager
	openCar     services.OpenCar
}

func (obj *signApi) WsHandler(c *gin.Context) {
	conn, err := obj.upgrade.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		http.NotFound(c.Writer, c.Request)
		return
	}
	//defer conn.Close()
	// 实例化一个WebSocketConn对象
	wsTransport := services.NewWebSocketConn(conn)
	//处理具体的请求消息
	obj.roomManager.HandleNewWebSocket(wsTransport, c.Request)
	//WebSocketConn开始读取消息
	wsTransport.ReadMessage()
}

func (obj *signApi) OpenCar(c *gin.Context) {
	identity := services.Identity(c.Query("identity"))
	err := obj.openCar.Peek(identity)
	if err != nil {
		log.Error(err.Error())
		return
	}
	conn, err := obj.upgrade.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		http.NotFound(c.Writer, c.Request)
		return
	}
	wsTransport := services.NewWebSocketConn(conn)
	obj.openCar.HandleMessage(identity, wsTransport)
	wsTransport.ReadMessage()
}
