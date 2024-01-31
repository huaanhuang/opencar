package jwt

import (
	"errors"
	"fmt"
	"github.com/dgrijalva/jwt-go/v4"
	"time"
)

var (
	secret         []byte        = []byte("THMxKyknSH2FJPkg") // 密钥
	periodValidity time.Duration = time.Hour * 24             // 有效期
)

// InitConfig 初始化jwt配置
func InitConfig(secretKey string, periodValidityTime time.Duration) {
	secret = []byte(secretKey)
	periodValidity = periodValidityTime
}

type UserInfo struct {
	Rtx      string `json:"rtx"`
	Username string `json:"username"`
}

type CustomClaims struct {
	UserInfo
	jwt.StandardClaims
}

// GenToken 创建Token
func GenToken(userInfo UserInfo) (string, error) {
	claim := CustomClaims{
		userInfo,
		jwt.StandardClaims{
			ExpiresAt: jwt.At(time.Now().Add(periodValidity)), //5分钟后过期
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claim)
	return token.SignedString(secret)
}

// ParseToken 解析token  过期会报错
func ParseToken(tokenStr string) (*CustomClaims, error) {
	token, err := jwt.ParseWithClaims(tokenStr, &CustomClaims{}, func(token *jwt.Token) (interface{}, error) {
		return secret, nil
	})
	if err != nil {
		fmt.Println(" token parse err:", err)
		return nil, err
	}
	if claims, ok := token.Claims.(*CustomClaims); ok && token.Valid {
		return claims, nil
	}
	return nil, errors.New("invalid token")
}

// RefreshToken 刷新Token
func RefreshToken(tokenStr string) (string, error) {
	jwt.TimeFunc = func() time.Time {
		return time.Unix(0, 0)
	}

	token, err := jwt.ParseWithClaims(tokenStr, &CustomClaims{}, func(token *jwt.Token) (interface{}, error) {
		return secret, nil
	})
	if err != nil {
		return "", err
	}
	if claims, ok := token.Claims.(*CustomClaims); ok && token.Valid {
		jwt.TimeFunc = time.Now
		claims.StandardClaims.ExpiresAt = jwt.At(time.Now().Add(time.Minute * 10))
		return GenToken(claims.UserInfo)
	}
	return "", errors.New("can not handle this token")
}
