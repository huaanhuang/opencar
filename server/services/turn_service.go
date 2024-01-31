package services

import (
	"fmt"
	"github.com/huaanhuang/opencar/settings"
	"github.com/huaanhuang/opencar/utils/log"
	"github.com/pion/turn/v3"
	"net"
)

type TurnCredentials struct {
	Username string   `json:"username"`
	Password string   `json:"password"`
	TTL      int      `json:"ttl"`
	Uris     []string `json:"uris"`
}

func NewTurnServices() *TurnServices {
	if settings.Conf.TurnConfig.PublicIp == "" {
		log.Panic("Turn service public_ip is required")
	}
	if settings.Conf.TurnConfig.Port <= 0 {
		log.Panic("Turn service port is required")
	}
	s := &TurnServices{
		Config:      settings.Conf.TurnConfig,
		AuthHandler: nil,
	}
	udpListener, err := net.ListenPacket("udp4", fmt.Sprintf("0.0.0.0:%d", s.Config.Port))
	if err != nil {
		log.Panicf("Failed to create TURN server listener: %s", err)
	}
	s.udpListener = udpListener

	turnServer, err := turn.NewServer(turn.ServerConfig{
		Realm:       s.Config.Realm,
		AuthHandler: s.HandleAuthenticate,
		PacketConnConfigs: []turn.PacketConnConfig{
			{
				PacketConn: udpListener,
				RelayAddressGenerator: &turn.RelayAddressGeneratorStatic{
					RelayAddress: net.ParseIP(s.Config.PublicIp),
					Address:      "0.0.0.0",
				},
			},
		},
	})
	if err != nil {
		log.Panicf("%v", err)
	}
	s.turnServer = turnServer
	log.Infof("TURN Serve listen at udp4 %s", fmt.Sprintf("0.0.0.0:%d", s.Config.Port))
	return s
}

// TurnServices NAT服务
type TurnServices struct {
	udpListener net.PacketConn
	turnServer  *turn.Server
	Config      *settings.TurnConfig
	AuthHandler func(username string, realm string, srcAddr net.Addr) (string, bool)
}

// HandleAuthenticate 处理认证
func (s *TurnServices) HandleAuthenticate(username string, realm string, srcAddr net.Addr) ([]byte, bool) {
	if s.AuthHandler != nil {
		if password, ok := s.AuthHandler(username, realm, srcAddr); ok {
			return turn.GenerateAuthKey(username, realm, password), true
		}
	}
	return nil, false
}

// Close 关闭Turn服务
func (s *TurnServices) Close() error {
	return s.turnServer.Close()
}
