package supervisor

import (
	"fmt"
	"github.com/huaanhuang/opencar/utils/log"
	"time"
)

// New 实例化
// 参考
// https://www.jianshu.com/p/de4bc02e7c72
// http://t.zoukankan.com/getong-p-2988702.html
func New() Supervisor {
	return &manager{
		tasks: make([]taskItem, 0),
	}
}

type Supervisor interface {
	AddTask(name string, task TaskFunc) Supervisor
	Run()
}

type Message struct {
	Name   string
	Status TaskStatus
	Info   interface{}
}

type TaskFunc func() error

type taskItem struct {
	name string   // 任务名称
	f    TaskFunc // 执行函数
}

type manager struct {
	tasks []taskItem
}

// AddTask 添加任务
func (m *manager) AddTask(name string, f TaskFunc) Supervisor {
	for _, task := range m.tasks {
		if task.name == name {
			panic(fmt.Sprintf("任务[%v]已存在", name))
		}
	}
	m.tasks = append(m.tasks, taskItem{
		name: name,
		f:    f,
	})
	return m
}

func (m *manager) Run() {
	if len(m.tasks) == 0 {
		return
	}
	// 开启任务协程
	mess := make(chan Message, len(m.tasks))
	for _, task := range m.tasks {
		go m.startTask(mess, task)
	}
	// 处理退出协程
	go m.handleExist(mess)
}

func (m *manager) startTask(mess chan Message, task taskItem) {
	con := NewController(task.name, mess)
	defer func() {
		if err := recover(); err != nil {
			con.Panic(err)
		}
	}()
	log.Infof("supervisor正在启动任务: [%v]", task.name)
	err := task.f()
	if err != nil {
		con.Error(err.Error())
	} else {
		con.Stop()
	}
}

func (m *manager) handleExist(mess chan Message) {
	for {
		select {
		case msg := <-mess:
			switch msg.Status {
			case NORMAL:
				log.Infof("任务[%v]正常退出", msg.Name)
			case ABNORMAL:
				log.Infof("任务[%v]panic退出, Error: %v, 默认10秒后重启", msg.Name, msg.Info)
				time.Sleep(10 * time.Second)
				for _, task := range m.tasks {
					if task.name == msg.Name {
						go m.startTask(mess, task)
					}
				}
			case MISTAKE:
				log.Infof("任务[%v]error退出, Error: %v", msg.Name, msg.Info)
			default:
				log.Infof("Error: 未知任务[%v]状态[%v]", msg.Name, msg.Status)
			}
		default:
			time.Sleep(1 * time.Second)
			//log.Info("message 队列已满")
		}
	}
}
