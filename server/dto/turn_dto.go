package dto

type CredentialsReq struct {
	Service  string `form:"service" binding:"required"`
	UserName string `form:"username" binding:"required"`
}
