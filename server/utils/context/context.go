package context

import (
	"encoding/json"
	"github.com/gin-gonic/gin"
	"github.com/gogf/gf/util/gconv"
	"github.com/huaanhuang/opencar/utils/jwt"
)

func UserInfo(c *gin.Context) jwt.CustomClaims {
	claims := jwt.CustomClaims{}
	val, _ := c.Get("user")
	marshal, err := json.Marshal(val)
	if err != nil {
		return claims
	}
	_ = gconv.Struct(string(marshal), &claims)
	return claims
}

func GetRtx(c *gin.Context) string {
	user := UserInfo(c)
	return user.Rtx
}

func GetUsername(c *gin.Context) string {
	user := UserInfo(c)
	return user.Username
}
