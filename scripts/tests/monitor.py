"""
@Time: 2024/1/23 14:26
@Auth: huangdingbo
@File: monitor.py
@IDE: PyCharm
@DESC: 系统运行监控设置
"""
import time

import psutil

start = int(time.time())

# 网络流量开始
net_io_start = psutil.net_io_counters()
bytes_sent_start = net_io_start.bytes_sent  # 发送
bytes_recv_start = net_io_start.bytes_recv  # 接收

# CPU使用率
cpu_usage = psutil.cpu_percent(interval=3)
print(f"CPU Usage: {cpu_usage}%")

# CPU核心数
cpu_cores = psutil.cpu_count(logical=False)
print(f"CPU Cores: {cpu_cores}")

# 网络流量信息
net_io_end = psutil.net_io_counters()
bytes_sent_end = net_io_end.bytes_sent
bytes_recv_end = net_io_end.bytes_recv
print(f"Total Bytes Sent: {bytes_sent_end} bytes")
print(f"Total Bytes Received: {bytes_recv_end} bytes")
print(f"Instantaneous Bytes Sent: {bytes_sent_end - bytes_sent_start} bytes")
print(f"Instantaneous Bytes Received: {bytes_recv_end - bytes_recv_start} bytes")

# 内存信息
memory = psutil.virtual_memory()
memory_total = memory.total
memory_used = memory.used
memory_percent = memory.percent
print(f"Memory Total: {memory_total} bytes")
print(f"Memory Used: {memory_used} bytes")
print(f"Memory Usage: {memory_percent}%")

# 磁盘信息
disk = psutil.disk_usage('/')
disk_total = disk.total
disk_used = disk.used
disk_percent = disk.percent
print(f"Disk Total: {disk_total} bytes")
print(f"Disk Used: {disk_used} bytes")
print(f"Disk Usage: {disk_percent}%")

# 获取所有进程信息
processes = []
for proc in psutil.process_iter(['pid', 'name', 'cpu_percent', 'memory_percent']):
    try:
        # 创建包含所需信息的字典
        process_info = {
            "pid": proc.info['pid'],
            "name": proc.info['name'],
            "cpu_percent": proc.info['cpu_percent'] or 0.0,  # 如果是None，则赋值为0.0
            "memory_percent": proc.info['memory_percent'] or 0.0  # 如果是None，则赋值为0.0
        }
        processes.append(process_info)
    except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
        # 忽略无法访问的进程
        pass

# 根据CPU占比排序
top_cpu_processes = sorted(processes, key=lambda x: x['cpu_percent'], reverse=True)[:10]

# 根据内存占比排序
top_memory_processes = sorted(processes, key=lambda x: x['memory_percent'], reverse=True)[:10]

print("Top 10 processes by CPU usage:")
for proc in top_cpu_processes:
    print(f"PID: {proc['pid']}, Name: {proc['name']}, CPU: {proc['cpu_percent']}%, Memory: {proc['memory_percent']}%")

print("\nTop 10 processes by Memory usage:")
for proc in top_memory_processes:
    print(f"PID: {proc['pid']}, Name: {proc['name']}, CPU: {proc['cpu_percent']}%, Memory: {proc['memory_percent']}%")

print(int(time.time()) - start)
