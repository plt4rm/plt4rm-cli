class FormScript {
    fields: any;
    fieldMap: any;
    formType: any;
    form: any;

    constructor(fields, formType) {
        this.fields = fields;
        this.formType = formType;
        this.form = document.getElementById('form');
        this.fieldMap = fields.reduce(function (map, field) {
            map[field.name] = field;
            map[field.name].element = $('#form-' + field.name);
            return map;
        }, {});

        let that = this;
        this.fields.forEach(function (field) {
            that.setMandatory(field.name, field.mandatory);
            that.setReadOnly(field.name, field.read_only);
        });
        this._attachListeners();
    }

    isCreateForm() {
        return this.formType === 'create';
    }

    isEditForm() {
        return this.formType === 'edit';
    }

    getLabel(fieldName) {
        return this.fieldMap[fieldName].label;
    }

    getValue(fieldName) {
        var field = this.fieldMap[fieldName];
        if (field) {
            if (field.type === 'boolean') {
                return this.getElement(fieldName).prop('checked');
            } else if (field.type === 'script') {
                // @ts-ignore
                return window.editors[fieldName].getValue();
            } else {
                return this.getElement(fieldName).val();
            }
        } else {
            console.warn("No such field - " + fieldName);
            return '';
        }
    }


    setValue(fieldName, value) {
        var field = this.fieldMap[fieldName];
        if (field) {
            if (field.type === 'boolean') {
                this.getElement(fieldName).prop('checked', value);
            } else if (field.type === 'script') {
                // @ts-ignore
                window.editors[fieldName].setValue(value);
            } else {
                this.getElement(fieldName).val(value);
            }
        } else {
            console.warn("No such field - " + fieldName)
        }
    }

    setDisplay(fieldName, display) {
        var element = this.getElement(fieldName);
        if (element.length) {
            if (display) {
                element.closest('.form-group').removeClass('d-none');
            } else {
                element.closest('.form-group').addClass('d-none');
            }
        }
    }

    getElement(fieldName) {
        return $('#form-' + fieldName);
    }

    addErrorMessage(htmlMessage) {
        $('#alert-zone').append('<div class="alert alert-danger alert-dismissible fade show mt-2 form-alert" role="alert">' +
            htmlMessage +
            '    <button type="button" class="close" data-dismiss="alert" aria-label="Close">' +
            '        <span aria-hidden="true">&times;</span>' +
            '    </button>' +
            '    </div>');
    }

    clearAlertMessages() {
        // @ts-ignore
        $('.form-alert').alert("close");
    }

    setMandatory(fieldName, mandatory) {
        var element = this.getElement(fieldName);
        if (element.length) {
            if (mandatory) {
                element.closest('.form-group').addClass('required');
                element.prop('required', true);
            } else {
                element.closest('.form-group').removeClass('required');
                element.prop('required', false);
            }
        }
    }


    isMandatory(fieldName) {
        var element = this.getElement(fieldName);
        if (element.length) {
            return element.prop('required');
        }
    }

    setReadOnly(fieldName, readOnly) {
        var element = this.getElement(fieldName);
        if (element.length) {
            if (readOnly && this.isMandatory(fieldName)) {
                this.addErrorMessage(this.fieldMap[fieldName].label + ' : mandatory field cannot be made read-only');
            } else
                element.prop('disabled', readOnly);
        }
    }


    getRecord() {
        let that = this;
        return this.fields.reduce(function (map, field) {
            map[field.name] = that.getValue(field.name);
            return map;
        }, {});
    }

    _attachListeners() {
        var that = this;
        this.fields.forEach(function (field) {
            if (field.type === 'script') {
                // @ts-ignore
                //  window.editors[fieldName].setValue(value);
            } else {
                that.getElement(field.name).on('change', function () {
                    that.fireCallBacks(field);
                });
            }
        });
    }

    fireCallBacks(field) {
        let that = this;
        that.changeCallbacks.forEach(function (callBack) {
            callBack(field, that.getValue(field.name));
        });
    }

    changeCallbacks: any = [];

    onChange(callBack) {
        this.changeCallbacks.push(callBack);
    }

    submitCallbacks: any = [];

    onSubmit(callBack) {
        this.submitCallbacks.push(callBack);
    }

    submit() {
        var that = this;
        var promises = [];
        this.submitCallbacks.forEach(function (callBack) {
            // @ts-ignore
            promises.push(new Promise((resolve, reject)=>{
                callBack(resolve, reject);
            }));

        });

        // @ts-ignore
        Promise.all(promises).then(function(){
            that.clearAlertMessages();
            var evt = document.createEvent("Event");
            evt.initEvent("submit", true, true);
            that.form.dispatchEvent(evt);
        });

    }
}

// @ts-ignore
((window, $) => {

    // @ts-ignore
    window.FormScript = FormScript;

})(window, $);