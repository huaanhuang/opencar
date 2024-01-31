package crypto

import (
	"crypto/md5"
	"fmt"
)

func Md5Encrypt(message string) string {
	hash := md5.New()
	hash.Write([]byte(message))
	md5Bytes := hash.Sum(nil)
	return fmt.Sprintf("%x", md5Bytes)
}
