'use strict';

const path = require('path');
const egg = require('egg');
const EGG_PATH = Symbol.for('egg#eggPath');
const EGG_LOADER = Symbol.for('egg#loader');
function callFn(fn, args, ctx) {
  args = args || [];
  return ctx ? fn.call(ctx, ...args) : fn(...args);
}
function wrapClass(Controller) {
  let proto = Controller.prototype;
  const ret = {};
  // tracing the prototype chain
  while (proto !== Object.prototype) {
    const keys = Object.getOwnPropertyNames(proto);
    for (const key of keys) {
      // getOwnPropertyNames will return constructor
      // that should be ignored
      if (key === 'constructor') {
        continue;
      }
      // skip getter, setter & non-function properties
      const d = Object.getOwnPropertyDescriptor(proto, key);
      // prevent to override sub method
      if (typeof d.value === 'function' && !ret.hasOwnProperty(key)) {
        ret[key] = methodToMiddleware(Controller, key);
      }
    }
    proto = Object.getPrototypeOf(proto);
  }
  return ret;

  function methodToMiddleware(Controller, key) {
    return function classControllerMiddleware(...args) {
      const controller = new Controller(this);
      if (
        !this.app.config.controller ||
        !this.app.config.controller.supportParams
      ) {
        // eslint-disable-next-line
        args = [this];
      }
      return callFn(controller[key], args, controller);
    };
  }
}
class AppWorkerLoader extends egg.AppWorkerLoader {
  load() {
    this.loadSchema();
    super.load();
    // 自己扩展
  }
  loadSchema() {
    // 处理 schema
    const schemaPaths = this.getLoadUnits().map(unit =>
      path.join(unit.path, 'app/schema')
    );
    // 先加载schema
    if (this.app.config.schema) {
      this.loadToApp(schemaPaths, 'schema');
    }
  }
  loadService(opt) {
    const { app } = this;
    super.loadService(opt);
    app.serviceObjects = {};
    Object.keys(app.serviceClasses).forEach(key => {
      app.serviceObjects[key] =
        app.serviceObjects[key] || app.serviceClasses[key];
    });
    // 处理 schema 定义的 service
    Object.keys(app.schema).forEach(name => {
      if (!app.config.schema.service) return; // 是否开启自动生成 service，默认开启
      app.serviceClasses[name] = this.createSchemaService(name);
      Object.assign(
        app.serviceClasses[name].prototype,
        app.serviceObjects.mixin, // 集成 mixin
        app.serviceObjects[name] // 集成自定义方法
      );
    });
    // 处理剩余 service，支持 module.exports = {} 的写法
    Object.keys(app.serviceObjects).forEach(name => {
      if (name === 'mixin') return;
      if (app.schema[name]) return;
      const service = app.serviceClasses[name];
      if (typeof service === 'function') {
        app.serviceClasses[name] = service;
      } else {
        app.serviceClasses[name] = this.createEmptyService();
        Object.assign(app.serviceClasses[name].prototype, service);
      }
    });
    delete app.serviceClasses.mixin; // 删除 mixin
  }

  loadController() {
    const { app } = this;
    // 处理 controller，先把原始controller存放到 controllerObjects
    const controllerPaths = this.getLoadUnits().map(unit =>
      path.join(unit.path, 'app/controller')
    );
    this.loadToApp(controllerPaths, 'controllerObjects');
    app.controllerObjects = app.controllerObjects || {};

    app.controller = app.controller || {};
    // 遍历 schema
    Object.keys(app.schema).forEach(name => {
      // 处理 schema 定义的 controller
      if (!app.config.schema.controller) return; // 是否开启自动生成 service，默认开启
      const Controller = this.createSchemaController(name);
      // 集成 mixin 和 自定义方法
      Object.assign(
        Controller.prototype,
        app.controllerObjects.mixin,
        app.controllerObjects[name]
      );
      app.controller[name] = wrapClass(Controller);
    });
    // 处理剩余的 controller
    Object.keys(app.controllerObjects).forEach(name => {
      if (app.controller[name]) return;
      if (name === 'eggMysqlBaseController') return;
      if (name === 'mixin') return;
      // 使用 class 定义的 controller
      if (typeof app.controllerObjects[name] === 'function') {
        app.controller[name] = wrapClass(app.controllerObjects[name]);
      } else {
        // 使用 module.exports 定义的 controller
        const Controller = this.createEmptyController();
        Object.assign(Controller.prototype, app.controllerObjects[name]);
        app.controller[name] = wrapClass(Controller);
      }
    });
  }
  createSchemaService(name) {
    class NewService extends this.app.serviceClasses.eggMysqlBaseService {
      get name() {
        return name;
      }
      get model() {
        const { app } = this;
        if (app.model[this.name]) return app.model[this.name];
        const modelData = require(path.join(this.name, 'app/schema'));
        const model = app.model.define(this.name, modelData);
        if (!model) throw new Error(`没有找到对应的model:${this.name}`);
        app.model[this.name] = model;
        return app.model[this.name];
      }
      get schema() {
        return this.app.schema[name];
      }
    }
    return NewService;
  }
  createEmptyService() {
    class NewService extends this.app.serviceClasses.eggMysqlBaseService {}
    return NewService;
  }
  createSchemaController(name) {
    class NewController extends this.app.controllerObjects
      .eggMysqlBaseController {
      get name() {
        return name;
      }
    }
    return NewController;
  }
  createEmptyController() {
    class NewController extends this.app.controllerObjects
      .eggMysqlBaseController {}
    return NewController;
  }
}
class Application extends egg.Application {
  get [EGG_PATH]() {
    return path.dirname(__dirname);
  }
  // 覆盖 Egg 的 Loader，启动时使用这个 Loader
  get [EGG_LOADER]() {
    return AppWorkerLoader;
  }
}

class Agent extends egg.Agent {
  get [EGG_PATH]() {
    return path.dirname(__dirname);
  }
}

module.exports = Object.assign(egg, {
  Application,
  Agent,
});
