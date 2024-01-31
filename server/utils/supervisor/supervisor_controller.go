package supervisor

type TaskStatus int8

const (
	NORMAL   TaskStatus = iota // 正常退出
	ABNORMAL                   // 异常退出  panic
	MISTAKE                    // 错误退出  error
)

func NewController(name string, message chan Message) Controller {
	return &controller{
		name:    name,
		message: message,
	}
}

type Controller interface {
	Stop(msg ...interface{})
	Panic(msg ...interface{})
	Error(msg ...interface{})
}

type controller struct {
	name    string // 任务名称
	message chan Message
}

// Stop 正常退出
func (c *controller) Stop(msg ...interface{}) {
	var info interface{}
	if len(msg) > 0 {
		info = msg[0]
	}
	c.message <- Message{
		Name:   c.name,
		Status: NORMAL,
		Info:   info,
	}
}

// Panic 程序产生panic退出
func (c *controller) Panic(msg ...interface{}) {
	var info interface{}
	if len(msg) > 0 {
		info = msg[0]
	}
	c.message <- Message{
		Name:   c.name,
		Status: ABNORMAL,
		Info:   info,
	}
}

// Error 程序error退出
func (c *controller) Error(msg ...interface{}) {
	var info interface{}
	if len(msg) > 0 {
		info = msg[0]
	}
	c.message <- Message{
		Name:   c.name,
		Status: MISTAKE,
		Info:   info,
	}
}
