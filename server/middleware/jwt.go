package middleware

import (
	"github.com/gin-gonic/gin"
	"github.com/huaanhuang/opencar/utils/jwt"
	"log"
	"net/http"
	"strings"
)

// JWTAuth 中间件，检查token
func JWTAuth() gin.HandlerFunc {
	return func(ctx *gin.Context) {
		authHeader := ctx.Request.Header.Get("Authorization")
		if authHeader == "" {
			ctx.JSON(http.StatusOK, gin.H{
				"code": 1005,
				"msg":  "用户未登录，正在跳转到授权页",
			})
			ctx.Abort() //结束后续操作
			return
		}
		log.Print("token:", authHeader)
		//按空格拆分
		parts := strings.SplitN(authHeader, " ", 2)
		if !(len(parts) == 2 && parts[0] == "Bearer") {
			ctx.JSON(http.StatusOK, gin.H{
				"code": -1,
				"msg":  "请求头中auth格式有误",
			})
			ctx.Abort()
			return
		}

		//解析token包含的信息
		claims, err := jwt.ParseToken(parts[1])
		if err != nil {
			ctx.JSON(http.StatusOK, gin.H{
				"code": 1005,
				"msg":  "登录已过期，正在跳转到授权页",
			})
			ctx.Abort()
			return
		}
		// 将当前请求的claims信息保存到请求的上下文c上
		ctx.Set("user", claims)
		ctx.Next() // 后续的处理函数可以用过ctx.Get("claims")来获取当前请求的用户信息
	}
}
