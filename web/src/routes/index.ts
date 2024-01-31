import {lazy} from 'react';

// 路由定义
const routes = [
    {
        title: 'Index',
        path: '/',
        component: lazy(() => import('@/pages/Index'))
    },
    {
        title: 'Answer',
        path: '/answer',
        component: lazy(() => import('@/pages/Answer'))
    },
    {
        title: 'camera',
        path: '/camera',
        component: lazy(() => import('@/pages/Camera/index'))
    },
    {
        title: 'audio',
        path: '/audio',
        component: lazy(() => import('@/pages/Audio/index'))
    },

];

export {routes};