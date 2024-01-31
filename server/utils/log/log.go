package log

import (
	"fmt"
	"go.uber.org/zap"
)

func Info(value ...interface{}) {
	zap.L().Info(fmt.Sprint(value...))
}

func Infof(format string, value ...interface{}) {
	zap.L().Info(fmt.Sprintf(format, value...))
}

func Warning(value ...interface{}) {
	zap.L().Warn(fmt.Sprint(value...))
}

func Warningf(format string, value ...interface{}) {
	zap.L().Warn(fmt.Sprintf(format, value...))
}

func Error(value ...interface{}) {
	zap.L().Error(fmt.Sprint(value...))
}

func Errorf(format string, value ...interface{}) {
	zap.L().Error(fmt.Sprintf(format, value...))
}

func Debug(value ...interface{}) {
	zap.L().Debug(fmt.Sprint(value...))
}

func Debugf(format string, value ...interface{}) {
	zap.L().Debug(fmt.Sprintf(format, value...))
}

func Panic(value ...interface{}) {
	zap.L().Panic(fmt.Sprint(value...))
}

func Panicf(format string, value ...interface{}) {
	zap.L().Panic(fmt.Sprintf(format, value...))
}

func Fatal(value ...interface{}) {
	zap.L().Fatal(fmt.Sprint(value...))
}

func Fatalf(format string, value ...interface{}) {
	zap.L().Fatal(fmt.Sprintf(format, value...))
}
