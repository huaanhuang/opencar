package settings

import (
	"fmt"
	"github.com/fsnotify/fsnotify"
	"github.com/spf13/viper"
)

// Conf 全局变量，用来保存全局的配置信息
var Conf = new(AppConfig)

type AppConfig struct {
	Name    string `mapstructure:"name"`
	Mode    string `mapstructure:"mode"`
	Version string `mapstructure:"version"`
	Port    int    `mapstructure:"port"`
	Token   string `mapstructure:"token"`

	*LogConfig    `mapstructure:"log"`
	*MySQLConfig  `mapstructure:"mysql"`
	*RedisConfig  `mapstructure:"redis"`
	*SystemConfig `mapstructure:"system"`
	*TurnConfig   `mapstructure:"turn"`
}

type LogConfig struct {
	Level      string `mapstructure:"level"`
	Filename   string `mapstructure:"filename"`
	MaxSize    int    `mapstructure:"max_size"`
	MaxAge     int    `mapstructure:"max_age"`
	MaxBackups int    `mapstructure:"max_backups"`
}

type MySQLConfig struct {
	Host         string `mapstructure:"host"`
	User         string `mapstructure:"user"`
	Password     string `mapstructure:"password"`
	DbName       string `mapstructure:"db_name"`
	Port         int    `mapstructure:"port"`
	MaxOpenConns int    `mapstructure:"max_open_conns"`
	MaxIdleConns int    `mapstructure:"max_idle_conns"`
	LogLevel     string `mapstructure:"log_level"`
}

type RedisConfig struct {
	Host     string `mapstructure:"host"`
	Password string `mapstructure:"password"`
	Port     int    `mapstructure:"port"`
	DB       int    `mapstructure:"database"`
	PoolSize int    `mapstructure:"pool_size"`
}

type SystemConfig struct {
	Appkey         string `mapstructure:"app_key"`
	SecretKey      string `mapstructure:"secret_key"`
	RedirectTo     string `mapstructure:"redirect_to"`
	ApplyLink      string `mapstructure:"apply_link"`
	SecUrl         string `mapstructure:"sec_url"`
	Tof4AppId      string `mapstructure:"tof4_app_id"`
	Tof4SystemId   string `mapstructure:"tof4_system_id"`
	KfApiAppKey    string `mapstructure:"kf_api_app_key"`
	KfApiAppSecret string `mapstructure:"kf_api_app_secret"`
	KfApiHost      string `mapstructure:"kf_api_host"`
	PgDomain       string `mapstructure:"pg_domain"`
}

type TurnConfig struct {
	PublicIp string `mapstructure:"public_ip"`
	Port     int    `mapstructure:"port"`
	Realm    string `mapstructure:"realm"`
	ShareKey string `mapstructure:"share_key"`
}

func Init() (err error) {
	viper.SetConfigFile("./config/config.yaml")
	//viper.SetConfigName("config")
	//viper.SetConfigType("yaml")  // 指定配置文件类型，专门用于从远程获取配置信息时指定配置文件的类型
	viper.AddConfigPath("./config")
	err = viper.ReadInConfig() // 读取配置文件
	if err != nil {
		// 读取配置文件失败
		fmt.Println("viper.ReadInConfig() failed,err : ", err)
		return
	}

	// 将配置文件的信息序反列化到结构体里面
	if err := viper.Unmarshal(Conf); err != nil {
		fmt.Printf("viper.Unmarshal failed, err:%v \n", err)
	}

	// 配置文件热加载
	viper.WatchConfig()
	viper.OnConfigChange(func(in fsnotify.Event) {
		fmt.Println("配置文件发生修改......")
		if err := viper.Unmarshal(Conf); err != nil {
			fmt.Printf("viper.Unmarshal failed, err:%v \n", err)
		}
	})
	return
}
