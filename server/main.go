package main

import (
	"context"
	"fmt"
	"github.com/gin-gonic/gin"
	"github.com/huaanhuang/opencar/routes"
	"github.com/huaanhuang/opencar/settings"
	"github.com/huaanhuang/opencar/utils/log"
	"github.com/huaanhuang/opencar/utils/logger"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"
)

func main() {
	// 1. 加载配置
	if err := settings.Init(); err != nil {
		fmt.Println("init Settings failed!!! err:", err)
		return
	}
	// 2. 设置环境 正式: gin.ReleaseMode 测试: gin.DebugMode
	gin.SetMode(settings.Conf.Mode)
	// 3. 初始化logger
	if err := logger.Init(&logger.Config{
		Level:      settings.Conf.LogConfig.Level,
		Filename:   settings.Conf.LogConfig.Filename,
		MaxSize:    settings.Conf.LogConfig.MaxSize,
		MaxAge:     settings.Conf.LogConfig.MaxAge,
		MaxBackups: settings.Conf.LogConfig.MaxBackups,
	}); err != nil {
		fmt.Println("init Logger failed!!! err:", err)
		return
	}
	// 4. 初始化SQL连接
	//if err := database.InitMysql(settings.Conf.MySQLConfig); err != nil {
	//	log.Errorf("init Mysql failed!!! err : ", err)
	//	return
	//}
	// 4. 初始化redis
	//err := database.InitRedisDb(settings.Conf.RedisConfig)
	//if err != nil {
	//	log.Errorf("init redis failed!!! err : ", err)
	//	return
	//}
	// 5. 注册路由
	r := routes.Setup()
	// 6. 启动服务（优雅关机，重启）
	srv := &http.Server{
		Addr:    fmt.Sprintf(":%d", settings.Conf.Port),
		Handler: r,
	}
	log.Infof("server start at :%d \n", settings.Conf.Port)
	go func() {
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			panic(fmt.Sprintf("listen: %s\n", err))
		}
	}()
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Info("Shutdown Server ...")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		log.Errorf("Server Shutdown: ", err)
	}
	log.Infof("Server exited")
}
