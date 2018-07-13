const logger = require('../../config/logger');
const ModelSessionFactory = require('../../collection/model-session-fatory');
const dsUtils = require('../../utils/ds-utils');
const Q = require('q');
const vm = require('vm');
const js2xmlparser = require('js2xmlparser');

class PlatformService {

    constructor(user) {
        this.sessionUser = user;
        this.Model = ModelSessionFactory.createModelWithSession(user);
    }

    getModel(modelName) {
        return new this.Model(modelName);
    }

    getMenus(cb) {
        let menuModel = this.getModel('p_menu');
        menuModel.find().exec(function (err, menus) {
            if (err)
                logger.error(err);
            else cb(menus);
        });
    }

    getMenuById(id, cb) {
        let menuModel = this.getModel('p_menu');
        menuModel.findById(id).exec(function (err, menu) {
            if (err)
                logger.error(err);
            else cb(menu);
        });
    }

    getApplications(cb) {
        let applicationModel = this.getModel('p_application');
        applicationModel.find({}, null, {sort: {order: 1}}).exec(function (err, applications) {
            if (err)
                logger.error(err);
            else cb(applications);
        });
    }

    getApplicationById(id, cb) {
        let applicationModel = this.getModel('p_application');
        applicationModel.findById(id).exec(function (err, application) {
            if (err)
                logger.error(err);
            else cb(application);
        });
    }

    getMenuAndModules(menuId, cb) {
        let promises = [];
        promises.push(this.getModel('p_menu').findById(menuId).exec());
        promises.push(this.getModel('p_module').find({menu: menuId}, null, {sort: {order: 1}}).exec());

        Q.all(promises).then(function (responses) {
            let menu = responses[0];
            let modules = responses[1];
            if (menu && modules) {
                modules = modules.map(module => {
                    let m = module.toObject();
                    if (m.type === 'list') {
                        m.url = '/p/' + m.ref_collection + '/list';
                    } else if (m.type === 'new') {
                        m.url = '/p/' + m.ref_collection + '/new';
                    }
                    return m;
                });

                modules = dsUtils.flatToHierarchy(modules);
                cb(menu, modules);
            } else
                cb(null);
        });
    }

    executeRestApi(req, res, cb) {
        let that = this;
        let restApiModel = this.getModel('p_rest_api');
        restApiModel.findOne({url: req.url, method: req.method}).exec((err, restApiRecord) => {
            if (restApiRecord) {
                let ctx = vm.createContext({req, res, Model: that.Model, js2xmlparser, JSON});
                vm.runInContext(restApiRecord.script, ctx);
            } else
                cb()
        });
    }

    populateOptions(fields, collectionId) {
        let promises = [];
        let optionModel = this.getModel('p_option');
        fields.forEach(function (field) {
            if (field.type === 'option') {
                let dfd = Q.defer();
                promises.push(dfd.promise);
                optionModel.find({ref_collection: collectionId, field: field.name}).exec((err, options) => {
                    field.options = options.map(model => model.toObject());
                    dfd.resolve();
                });
            }
        });
        return Q.all(promises);
    }

    getCollectionByName(collectionName) {
        let collectionModel = this.getModel('p_collection');
        return collectionModel.findOne({name: collectionName}).exec();
    }

    getFieldsForCollection(collectionId) {
        let fieldModel = this.getModel('p_field');
        return fieldModel.find({ref_collection: collectionId}).exec();
    }

    executeAction(collectionId, recordIds, cb) {
        let model = this.getModel(collectionId);
        model.remove({_id: recordIds}).exec(function (err) {
            cb(err);
        });
    }

    getListFormData(collectionName, query, cb, fail) {
        let that = this;
        this.getCollectionByName(collectionName).then(function(collection){
            that.getFieldsForCollection(collection.id).then(function(fields){
                let conditions = {}, options;
                if (query.sort) {
                    options = {};
                    options.sort = JSON.parse(query.sort);
                }
                if (query.conditions) {
                    conditions = JSON.parse(query.conditions);
                }
                let collectionModel = that.getModel(collectionName);
                collectionModel.find(conditions, null, options).exec(function (err, data) {
                    let collectionObj = {
                        label: collection.label,
                        name: collection.name
                    };
                    cb(collectionObj, data, fields);
                });
            })
        });
    }
}

module.exports = PlatformService;