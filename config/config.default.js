'use strict';

module.exports = () => {
  const config = {};

  /**
   * some description
   * @member Config#test
   * @property {String} key - some description
   */
  config.schema = {
    service: true, // 是否自动生成 service
    controller: true, // 是否自动生成 controller
  };
  return config;
};
