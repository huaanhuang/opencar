"""
@Time: 2024/1/15 20:11
@Auth: huangdingbo
@File: config.py
@IDE: PyCharm
@DESC: 控制器配置
"""
from dataclasses import dataclass


@dataclass
class Config:
    """
    控制器配置
    """
    # 档位和占空比映射
    gear_duty_cycle_map: dict = None
    # 舵机pwm引脚编号
    servo_pwm: int = None
    # 前驱pwm引脚编号
    pre_pwm: int = None
    # 前驱输入引脚编号
    pre_in: int = None
    # 前驱输出引脚编号
    pre_out: int = None
    # 后驱pwm引脚编号
    end_pwm: int = None
    # 后驱输入引脚编号
    end_in: int = None
    # 后驱输出引脚编号
    end_out: int = None
    # 蜂鸣器的GPIO引脚编号
    buzzer_pin: int = None
    # 无源蜂鸣器频率
    pitch: int = None
    # 二自由度云台水平舵机引脚
    servo_x_pwm: int = None
    # 二自由度云台垂直舵机引脚
    servo_y_pwm: int = None
    # 前大灯引脚
    headlights: int = None
    # 刹车灯引脚
    brake_light: int = None
    # 左转向灯引脚
    left_turn_signal: int = None
    # 右转向灯引脚
    right_turn_signal: int = None


@dataclass
class Instruction:
    """
    指令
    """
    # 通道 bf(前进/后退) | lr(左转/右转) | gear(档位)
    channel: str
    # down/up 按下/抬起
    type: str
    # 键值
    key: str
