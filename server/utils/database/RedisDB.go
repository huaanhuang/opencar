package database

import (
	"fmt"
	"github.com/go-redis/redis"
	"github.com/huaanhuang/opencar/settings"
)

var redisDb *redis.Client

func Redis() *redis.Client {
	return redisDb
}

func InitRedisDb(cfg *settings.RedisConfig) (err error) {
	redisDb = redis.NewClient(&redis.Options{
		Addr:     fmt.Sprintf("%s:%d", cfg.Host, cfg.Port), // 指定
		Password: cfg.Password,
		DB:       cfg.DB, // redis一共16个库，指定其中一个库即可
		PoolSize: cfg.PoolSize,
	})
	_, err = redisDb.Ping().Result()
	return
}
