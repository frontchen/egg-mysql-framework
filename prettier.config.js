module.exports = {
  trailingComma: 'es5', // 尽可能控制尾随逗号的输出。 有效选项： '无' - 无尾随逗号 'es5' - 在ES5中有效的尾随逗号（对象，数组等）'all' - 尾随逗号 尽可能（函数参数）
  tabWidth: 2, // 每个制表符占用的空格数
  semi: true, // 是否在每行末尾添加分号
  singleQuote: true, // 如果为 true，将使用单引号而不是双引号
  arrowParens: 'avoid', // 当箭头函数仅有一个参数时加上括号 always avoid
  ['array-bracket-spacing']: [2, 'never'],
};
