'use strict';

module.exports = () => {
  const config = {};
  config.keys = '123456';
  config.sequelize = {
    dialect: 'mysql', // support: mysql, mariadb, postgres, mssql
    password: '123456',
    host: '127.0.0.1',
    port: 3306,
    database: 'egg-blog',
    define: {
      // model的全局配置
      timestamps: true, // 添加create,update,delete时间戳
      paranoid: true, // 添加软删除
      freezeTableName: true, // 防止修改表名为复数
      underscored: true, // 防止驼峰式字段被默认转为下划线
    },
    timezone: '+8:00', // 由于orm用的UTC时间，这里必须加上东八区，否则取出来的时间相差8小时
    dialectOptions: {
      // 让读取date类型数据时返回字符串而不是UTC时间
      dateStrings: true,
      typeCast(field, next) {
        if (field.type === 'DATETIME') {
          return field.string();
        }
        return next();
      },
    },
  };
  return config;
};
