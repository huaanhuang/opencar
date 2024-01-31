package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/huaanhuang/opencar/api"
	"github.com/huaanhuang/opencar/middleware"
)

func Setup() *gin.Engine {

	r := gin.Default()
	r.Use(middleware.Cors(), middleware.GinLogger(), middleware.GinRecovery(true), middleware.TokenAuth())
	{
		turnApi := api.NewTurnApi()
		r.GET("/turn", turnApi.Credentials)
	}
	{
		signApi := api.NewSignApi()
		r.GET("/ws", signApi.WsHandler)
		r.GET("/car", signApi.OpenCar)
	}
	return r
}
