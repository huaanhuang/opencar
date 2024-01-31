package supervisor

import (
	"errors"
	"fmt"
	"git.woa.com/kf_trpc/apms_proj/internal/infrastructure/logger"
	"testing"
	"time"
)

func TestNew(t *testing.T) {
	if err := logger.Init(&logger.Config{
		Level:      "debug",
		Filename:   "./main.log",
		MaxSize:    10,
		MaxAge:     30,
		MaxBackups: 5,
	}); err != nil {
		fmt.Println("init Logger failed!!! err:", err)
		return
	}

	m := New()
	m.AddTask("任务1", task1)
	m.AddTask("任务2", task2)
	m.AddTask("任务3", task3)
	m.Run()

	for {
		time.Sleep(1 * time.Second)
	}
}

func task1() error {
	time.Sleep(time.Second * 1)
	return nil
}

func task2() error {
	time.Sleep(time.Second * 2)
	return errors.New("error退出")
}

func task3() error {
	time.Sleep(time.Second * 3)
	panic("产生panic")
}
