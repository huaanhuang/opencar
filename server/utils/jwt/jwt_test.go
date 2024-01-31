package jwt

import (
	"fmt"
	"testing"
)

func TestGenToken(t *testing.T) {
	user := UserInfo{
		Rtx:      "zhangsan",
		Username: "zhangsan(zhangsan)",
	}
	//生成token
	token, err := GenToken(user)
	if err != nil {
		t.Error("生成token错误: ", err)
		return
	}
	fmt.Println(token)

	parseToken, err := ParseToken(token)
	if err != nil {
		t.Error("解析token错误: ", err)
		return
	}
	fmt.Println(parseToken)

	refreshToken, err := RefreshToken(token)
	if err != nil {
		t.Error("刷新token错误: ", err)
		return
	}
	fmt.Println("刷新token: ", refreshToken)
	claims, err := ParseToken(refreshToken)
	if err != nil {
		t.Error("解析刷新token错误: ", err)
		return
	}
	fmt.Println("刷新token解析结果: ", claims)
}
