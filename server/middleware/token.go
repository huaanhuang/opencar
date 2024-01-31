package middleware

import (
	"github.com/gin-gonic/gin"
	"github.com/huaanhuang/opencar/settings"
	"github.com/huaanhuang/opencar/utils/crypto"
	"github.com/huaanhuang/opencar/utils/response"
)

// TokenAuth 中间件，检查token
func TokenAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		token := c.Request.Header.Get("Token")
		if token == "" {
			token = c.Query("token")
		}
		if token == "" || token != crypto.Md5Encrypt(settings.Conf.Token) {
			response.Json(c, response.WithCode(10005), response.WithMsg("用户未登录"))
			return
		}
		c.Next()
	}
}
