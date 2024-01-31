import React from 'react';
import { Result } from 'antd';

const NotFound: React.FC = () => {

  return (
      <Result
          status="404"
          title="404"
          subTitle="抱歉，访问页面不存在。"
      />
  )
}

export default NotFound;