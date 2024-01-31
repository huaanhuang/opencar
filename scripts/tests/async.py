"""
@Time: 2024/1/26 09:12
@Auth: huangdingbo
@File: async.py
@IDE: PyCharm
@DESC: asyncio
"""
import asyncio
import uvloop
asyncio.set_event_loop_policy(uvloop.EventLoopPolicy())


async def func():
    print("1")
    await asyncio.sleep(1)
    print("2")
    return "111"


async def main():
    tasks = [
        asyncio.create_task(func(), name="n1"),
        asyncio.create_task(func(), name="n2"),
    ]

    done, _ = await asyncio.wait(tasks)
    print(done)


if __name__ == '__main__':
    asyncio.run(main())
