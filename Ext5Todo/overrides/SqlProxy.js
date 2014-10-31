/**
 * SQL proxy override for ExtJS 5.  The current shipping sql proxy in ExtJS does not work as of version 5.0.1.
 */
Ext.define('Overrides.SqlProxy', {
    override: 'Ext.data.proxy.Sql',

    constructor: function (config) {

        if (config.model && !config.model.getIdProperty) {
            config.model.addStatics({
                getIdProperty: function () {
                    return this.idProperty;
                }
            });
        }

        this.callParent(arguments);
    },

    /**
     * @override
     * Override that uses model.getName and iterates over getFields array
     * differently so that it works in ExtJS 5
     */
    updateModel: function (model) {
        if (model) {
            var modelName = model.modelName || model.getName(),
                defaultDateFormat = this.getDefaultDateFormat(),
                table = modelName.slice(modelName.lastIndexOf('.') + 1),
                fields = model.getFields(),
                isUnique = model.indentifier ? model.indentifier.isUnique : false;

            Ext.Array.each(fields, function (field) {
                if (field.isDateField && !field.getDateFormat()) {
                    field.dateFormat = defaultDateFormat;
                }
            });

            this.setUniqueIdStrategy(isUnique);
            if (!this.getTable()) {
                this.setTable(table);
            }
            this.setColumns(this.getPersistedModelColumns(model));
        }

        // callSuper is broke for overrides in production builds (refer to SDKTOOLS-945 for more info)
        Ext.data.proxy.Client.superclass.updateModel.apply(this, arguments);
        //this.callSuper(arguments);

    },


    create: function (operation, callback, scope) {
        var me = this,
            db = me.getDatabaseObject(),
            records = operation.getRecords(),
            tableExists = me.getTableExists();

        operation.setStarted();

        db.transaction(
            function (transaction) {
                if (!tableExists) {
                    me.createTable(transaction);
                }

                me.insertRecords(records, transaction, function (resultSet, error) {
                    if (error) {
                        operation.setException(error);
                    } else {
                        operation.setResultSet(resultSet);
                        operation.setSuccessful(true);
                    }
                }, me);
            },
            function (transaction, error) {
                me.setException(operation, error);
                if (typeof callback === 'function') {
                    callback.call(scope || me, operation);
                }
            },
            function (transaction) {
                if (typeof callback === 'function') {
                    callback.call(scope || me, operation);
                }
            }
        );
    },

    read: function (operation, callback, scope) {
        var me = this,
            db = me.getDatabaseObject(),
            model = me.getModel(),
            idProperty = model.getIdProperty(),
            tableExists = me.getTableExists(),
            params = operation.getParams() || {},
            id = params[idProperty],
            sorters = operation.getSorters(),
            filters = operation.getFilters(),
            page = operation.getPage(),
            start = operation.getStart(),
            limit = operation.getLimit(),
            filtered, i, ln;

        params = Ext.apply(params, {
            page: page,
            start: start,
            limit: limit,
            sorters: sorters,
            filters: filters
        });

        operation.setStarted();

        db.transaction(
            function (transaction) {
                if (!tableExists) {
                    me.createTable(transaction);
                }

                me.selectRecords(transaction, id !== undefined ? id : params, function (resultSet, error) {
                    if (operation.process(resultSet, null, null) === false) {
                        me.fireEvent('exception', me, operation);
                    }

                    if (error) {
                        operation.setException(error);
                    }

                    if (filters && filters.length) {
                        filtered = Ext.create('Ext.util.Collection', function (record) {
                            return record.getId();
                        });
                        filtered.setFilterRoot('data');
                        for (i = 0, ln = filters.length; i < ln; i++) {
                            if (filters[i].getProperty() === null) {
                                filtered.addFilter(filters[i]);
                            }
                        }
                        filtered.addAll(operation.getRecords());

                        operation.setRecords(filtered.items.slice());
                        resultSet.setRecords(operation.getRecords());
                        resultSet.setCount(filtered.items.length);
                        resultSet.setTotal(filtered.items.length);
                        operation.setSuccessful(true);
                    }
                });
            },
            function (transaction, error) {
                me.setException(operation, error);
                if (typeof callback === 'function') {
                    callback.call(scope || me, operation);
                }
            },
            function (transaction) {
                if (typeof callback === 'function') {
                    callback.call(scope || me, operation);
                }
            }
        );
    },

    update: function (operation, callback, scope) {
        var me = this,
            records = operation.getRecords(),
            db = me.getDatabaseObject(),
            tableExists = me.getTableExists();

        operation.setStarted();

        db.transaction(
            function (transaction) {
                if (!tableExists) {
                    me.createTable(transaction);
                }

                me.updateRecords(transaction, records, function (resultSet, error) {
                    if (error) {
                       operation.setException(error);
                    } else {
                        operation.setResultSet(resultSet);
                        operation.setSuccessful(true);
                    }

                });
            },
            function (transaction, error) {
                me.setException(operation, error);
                if (typeof callback === 'function') {
                    callback.call(scope || me, operation);
                }
            },
            function (transaction) {
                if (typeof callback === 'function') {
                    callback.call(scope || me, operation);
                }
            }
        );
    },

    erase: function (operation, callback, scope) {
        var me = this,
            records = operation.getRecords(),
            db = me.getDatabaseObject(),
            tableExists = me.getTableExists();

        operation.setStarted();

        db.transaction(
            function (transaction) {
                if (!tableExists) {
                    me.createTable(transaction);
                }

                me.destroyRecords(transaction, records, function (resultSet, error) {
                    if (operation.process(resultSet) === false) {
                        me.fireEvent('exception', me, operation);
                    }

                    if (error) {
                       operation.setException(error);
                    }
                });
            },
            function (transaction, error) {
                me.setException(operation, error);
                if (typeof callback === 'function') {
                    callback.call(scope || me, operation);
                }
            },
            function (transaction) {
                if (typeof callback === 'function') {
                    callback.call(scope || me, operation);
                }
            }
        );
    },

    createTable: function (transaction) {
        transaction.executeSql('CREATE TABLE IF NOT EXISTS ' + this.getTable() + ' (' + this.getSchemaString() + ')');
        this.setTableExists(true);
    },

    insertRecords: function (records, transaction, callback, scope) {
        var me = this,
            table = me.getTable(),
            columns = me.getColumns(),
            totalRecords = records.length,
            executed = 0,
            tmp = [],
            insertedRecords = [],
            errors = [],
            uniqueIdStrategy = me.getUniqueIdStrategy(),
            i, ln, placeholders, result;

        result = new Ext.data.ResultSet({
            records: insertedRecords,
            success: true
        });

        for (i = 0, ln = columns.length; i < ln; i++) {
            tmp.push('?');
        }
        placeholders = tmp.join(', ');

        Ext.each(records, function (record) {
            var id = record.getId(),
                data = me.getRecordData(record),
                values = me.getColumnValues(columns, data);

            transaction.executeSql(
                'INSERT INTO ' + table + ' (' + columns.join(', ') + ') VALUES (' + placeholders + ')',
                values,
                function (transaction, resultSet) {
                    executed++;
                    record.setId(uniqueIdStrategy ? id : resultSet.insertId);
                    record.commit();
                    insertedRecords.push(record);

                    if (executed === totalRecords && typeof callback === 'function') {
                        callback.call(scope || me, result, errors.length > 0 ? errors : null);
                    }
                },
                function (transaction, error) {
                    executed++;
                    errors.push({
                        clientId: id,
                        error: error
                    });

                    if (executed === totalRecords && typeof callback === 'function') {
                        callback.call(scope || me, result, errors);
                    }
                }
            );
        });
    },

    selectRecords: function (transaction, params, callback, scope) {
        var me = this,
            table = me.getTable(),
            idProperty = me.getModel().getIdProperty(),
            sql = 'SELECT * FROM ' + table,
            countSql = 'SELECT COUNT(*) as count FROM ' + table,
            needTotalCount = false,
            records = [],
            filterStatement = ' WHERE ',
            sortStatement = ' ORDER BY ',
            Model = me.getModel(),
            i, ln, data, result, count, rows, filter, sorter, property, value;


        result = new Ext.data.ResultSet({
            records: records,
            success: true
        });

        if (!Ext.isObject(params)) {
            sql += filterStatement + idProperty + ' = ' + params;
        } else {

            // handle filters
            ln = params.filters && params.filters.length;
            if (ln) {
                for (i = 0; i < ln; i++) {
                    filter = params.filters[i];
                    property = filter.getProperty();
                    value = filter.getValue();
                    if (property !== null) {
                        sql += filterStatement + property + ' ' + (filter.getAnyMatch() ? ('LIKE \'%' + value + '%\'') : ('= \'' + value + '\''));
                        filterStatement = ' AND ';
                    }
                }
            }

            // handle sorters
            ln = params.sorters && params.sorters.length;
            if (ln) {
                for (i = 0; i < ln; i++) {
                    sorter = params.sorters[i];
                    property = sorter.getProperty();
                    if (property !== null) {
                        sql += sortStatement + property + ' ' + sorter.getDirection();
                        sortStatement = ', ';
                    }
                }
            }

            // handle paging
            if (params.page !== undefined) {
                needTotalCount = true;
                sql += ' LIMIT ' + parseInt(params.start, 10) + ', ' + parseInt(params.limit, 10);
            }
        }

        transaction.executeSql(
            sql, 
            [],
            function (transaction, resultSet) {
                var rec;
                rows = resultSet.rows;
                count = rows.length;

                for (i = 0, ln = count; i < ln; i++) {
                    data = rows.item(i);
                    rec = new Model();
                    rec.set(data);
                    rec.setId(data[idProperty]);
                    rec.commit();
                    records.push(rec);
                }
                
                result.setSuccess(true);
                result.setTotal(count);
                result.setCount(count);

                // if paging is happening then needTotalCount is true and the callback will be handled below
                if (!needTotalCount) {
                    if (typeof callback === 'function') {
                        callback.call(scope || me, result);
                    }
                }
            },
            function (transaction, error) {

                result.setSuccess(false);
                result.setTotal(0);
                result.setCount(0);

                if (typeof callback === 'function') {
                    callback.call(scope || me, result, error);
                }
            }
        );

        // Fix to have proper totals when paging is used
        if (needTotalCount) {
            transaction.executeSql(
                countSql,
                [],
                function (transaction, resultSet) {
                    rows = resultSet.rows;
                    count = rows.item(0).count;
                    result.setTotal(count);

                    if (typeof callback === 'function') {
                        callback.call(scope || me, result);
                    }
                },
                function (transaction, error) {
                    result.setSuccess(false);
                    result.setTotal(0);
                    result.setCount(0);

                    if (typeof callback === 'function') {
                        callback.call(scope || me, result, error);
                    }
                }
            );
        }

    },

    updateRecords: function (transaction, records, callback, scope) {
        var me = this,
            table = me.getTable(),
            columns = me.getColumns(),
            totalRecords = records.length,
            idProperty = me.getModel().getIdProperty(),
            executed = 0,
            updatedRecords = [],
            errors = [],
            i, ln, result;

        result = new Ext.data.ResultSet({
            records: updatedRecords,
            success: true
        });

        Ext.each(records, function (record) {
            var id = record.getId(),
                data = me.getRecordData(record),
                values = me.getColumnValues(columns, data),
                updates = [];

            for (i = 0, ln = columns.length; i < ln; i++) {
                updates.push(columns[i] + ' = ?');
            }

            transaction.executeSql(
                'UPDATE ' + table + ' SET ' + updates.join(', ') + ' WHERE ' + idProperty + ' = ?',
                values.concat(id),
                function (transaction, resultSet) {
                    executed++;
                    record.commit();
                    updatedRecords.push(record);

                    if (executed === totalRecords && typeof callback === 'function') {
                        callback.call(scope || me, result, errors.length > 0 ? errors : null);
                    }
                },
                function (transaction, error) {
                    executed++;
                    errors.push({
                        clientId: id,
                        error: error
                    });

                    if (executed === totalRecords && typeof callback === 'function') {
                        callback.call(scope || me, result, errors);
                    }
                }
            );
        });
    },

    destroyRecords: function (transaction, records, callback, scope) {
        var me = this,
            table = me.getTable(),
            idProperty = me.getModel().getIdProperty(),
            ids = [],
            values = [],
            destroyedRecords = [],
            i, ln, result, record;

        for (i = 0, ln = records.length; i < ln; i++) {
            ids.push(idProperty + ' = ?');
            values.push(records[i].getId());
        }

        result = new Ext.data.ResultSet({
            records: destroyedRecords,
            success: true
        });

        transaction.executeSql(
            'DELETE FROM ' + table + ' WHERE ' + ids.join(' OR '), 
            values,
            function (transaction, resultSet) {
                for (i = 0, ln = records.length; i < ln; i++) {
                    record = records[i];
                    destroyedRecords.push({
                        id: record.getId()
                    });
                }

                if (typeof callback === 'function') {
                    callback.call(scope || me, result);
                }
            },
            function (transaction, error) {
                if (typeof callback === 'function') {
                    callback.call(scope || me, result, error);
                }
            }
        );
    },

    /**
     * @override
     * Override the fixes the following:
     *   - changes from using fields.each Ext.Array.each
     */
    getRecordData: function (record) {
        var me = this,
            fields = record.getFields(),
            idProperty = record.getIdProperty(),
            uniqueIdStrategy = me.getUniqueIdStrategy(),
            data = {},
            name, value;

        Ext.Array.each(fields, function (field) {

            if (field.persist) {
                name = field.name;
                if (name === idProperty && !uniqueIdStrategy) {
                    return;
                }
                value = record.get(name);
                if (field.isDateField) {
                    value = me.writeDate(field, value);
                }
                data[name] = value;
            }
        }, me);

        return data;
    },

    getColumnValues: function (columns, data) {
        var ln = columns.length,
            values = [],
            i, column, value;

        for (i = 0; i < ln; i++) {
            column = columns[i];
            value = data[column];
            if (value !== undefined) {
                values.push(value);
            }
        }

        return values;
    },

    getSchemaString: function () {
        var me = this,
            schema = [],
            model = me.getModel(),
            idProperty = model.getIdProperty(),
            fields = model.getFields().items,
            uniqueIdStrategy = me.getUniqueIdStrategy(),
            ln = fields.length,
            i, field, type, name;

        for (i = 0; i < ln; i++) {
            field = fields[i];
            type = field.getType();
            name = field.name;

            if (name === idProperty) {
                if (uniqueIdStrategy) {
                    type = me.convertToSqlType(type);
                    schema.unshift(idProperty + ' ' + type);
                } else {
                    schema.unshift(idProperty + ' INTEGER PRIMARY KEY AUTOINCREMENT');
                }
            } else {
                type = me.convertToSqlType(type);
                schema.push(name + ' ' + type);
            }
        }

        return schema.join(', ');
    },

    getPersistedModelColumns: function (model) {
        var fields = model.getFields().items,
            uniqueIdStrategy = this.getUniqueIdStrategy(),
            idProperty = model.getIdProperty(),
            columns = [],
            ln = fields.length,
            i, field, name;

        for (i = 0; i < ln; i++) {
            field = fields[i];
            name = field.name;

            if (name === idProperty && !uniqueIdStrategy) {
                continue;
            }

            if (field.persist) {
                columns.push(field.name);
            }
        }
        return columns;
    },

    convertToSqlType: function (type) {
        switch (type.toLowerCase()) {
            case 'date':
            case 'string':
            case 'auto':
                return 'TEXT';
            case 'int':
                return 'INTEGER';
            case 'float':
                return 'REAL';
            case 'boolean':
                return 'NUMERIC';
        }
    },

    writeDate: function (field, date) {
        if (Ext.isEmpty(date)) {
            return null;
        }

        var dateFormat = field.getDateFormat() || this.getDefaultDateFormat();
        switch (dateFormat) {
            case 'timestamp':
                return date.getTime() / 1000;
            case 'time':
                return date.getTime();
            default:
                return Ext.Date.format(date, dateFormat);
        }
    },

    dropTable: function (config) {
        var me = this,
            table = me.getTable(),
            callback = config ? config.callback : null,
            scope = config ? config.scope || me : null,
            db = me.getDatabaseObject();

        db.transaction(
            function (transaction) {
                transaction.executeSql('DROP TABLE ' + table);
            },
            function (transaction, error) {
                if (typeof callback === 'function') {
                    callback.call(scope || me, false, table, error);
                }
            },
            function (transaction) {
                if (typeof callback === 'function') {
                    callback.call(scope || me, true, table);
                }
            }
        );

        me.setTableExists(false);
    },

    getDatabaseObject: function () {
        return openDatabase(this.getDatabase(), '1.0', 'Sencha Database', 5 * 1024 * 1024);
    }
});
