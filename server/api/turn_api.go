package api

import (
	"crypto/hmac"
	"crypto/sha1"
	"encoding/base64"
	"fmt"
	"github.com/gin-gonic/gin"
	"github.com/huaanhuang/opencar/dto"
	"github.com/huaanhuang/opencar/services"
	"github.com/huaanhuang/opencar/settings"
	"github.com/huaanhuang/opencar/utils/expiredmap"
	"github.com/huaanhuang/opencar/utils/log"
	"github.com/huaanhuang/opencar/utils/response"
	"net"
	"time"
)

func NewTurnApi() TurnApi {
	a := &turnApi{
		expiredMap:  expiredmap.NewExpiredMap(),
		turnService: services.NewTurnServices(),
	}
	a.turnService.AuthHandler = a.authHandler
	return a
}

type TurnApi interface {
	Credentials(c *gin.Context)
}

type turnApi struct {
	expiredMap  *expiredmap.ExpiredMap
	turnService *services.TurnServices
}

func (obj *turnApi) authHandler(username string, realm string, srcAddr net.Addr) (string, bool) {
	if found, info := obj.expiredMap.Get(username); found {
		credential := info.(services.TurnCredentials)
		return credential.Password, true
	}
	return "", false
}

func (obj *turnApi) Credentials(c *gin.Context) {
	var req dto.CredentialsReq
	if err := c.ShouldBindQuery(&req); err != nil {
		response.Json(c, response.WithCode(-1), response.WithMsg(err.Error()))
		return
	}
	// 当前时间戳
	timestamp := time.Now().Unix()
	// 时间戳:用户名 1587944830:flutter-webrtc
	turnUsername := fmt.Sprintf("%d:%s", timestamp, req.UserName)
	log.Infof("turnUsername: %s", turnUsername)

	// hmac是密钥相关的哈希运算消息认证码
	h := hmac.New(sha1.New, []byte(settings.Conf.TurnConfig.ShareKey))
	// 1587944058:flutter-webrtc 9V6nnqG+XYxtmngnzxIXeRCHQqk
	h.Write([]byte(turnUsername))
	//生成密码
	turnPassword := base64.RawStdEncoding.EncodeToString(h.Sum(nil))
	log.Infof("turnPassword: %s", turnPassword)

	// 生成认证信息并设置过期时间
	ttl := 86400
	host := fmt.Sprintf("%s:%d", obj.turnService.Config.PublicIp, obj.turnService.Config.Port)
	credential := services.TurnCredentials{
		Username: turnUsername,
		Password: turnPassword,
		TTL:      ttl,
		Uris: []string{
			"turn:" + host + "?transport=udp",
		},
	}
	obj.expiredMap.Set(turnUsername, credential, int64(ttl))
	// 响应
	response.Json(c, response.WithData(map[string]interface{}{
		"turn": credential,
		"stun": services.TurnCredentials{
			Uris: []string{
				"stun:" + host,
			},
		},
	}))
}
