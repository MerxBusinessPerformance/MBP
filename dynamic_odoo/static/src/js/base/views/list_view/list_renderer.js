odoo.define('dynamic_odoo.ListRenderer', function (require) {

    var ListRenderer = require('web.ListRenderer');
    var Domain = require('web.Domain');
    var ListController = require('web.ListController');
    var BasicFields = require("dynamic_odoo.basic_fields");
    const {patch} = require('web.utils');
    const components = {
        SearchBar: require('web.SearchBar')
    };

    patch(components.SearchBar.prototype, 'dynamic_odoo.ListRenderer', {
        _onFacetRemove(facet) {
            this._super(facet);
            const filters = this.model.get("filters").filter((filter) => filter.search_advance && filter.groupId == facet.groupId);
            const parentWidget = this.__owl__.parent.__owl__.parent.parentWidget;
            if (parentWidget.facetRemove) {
                parentWidget.facetRemove({filters: filters});
            }
        }
    });

    ListController.include({
        init: function (parent, model, renderer, params) {
            this._super(parent, model, renderer, params);
        },
        onSearchAdvance: function (params) {
            const {group, filters} = params;
            if (group) {
                this.searchModel.dispatch('deactivateGroup', group.id);
            }
            if (filters && filters.length) {
                this.searchModel.dispatch('createNewFilters', filters);
            }
        },
        facetRemove: function (params) {
            const {filters} = params;
            if (filters && filters.length) {
                this.renderer.facetRemove(filters.map((filter) => filter.search_advance));
            }
        },
    });

    ListRenderer.include({
        init: function (parent, state, params) {
            this._super(parent, state, params);
            // this.searchModel = useModel('searchModel');
            if (this.arch) {
                const {search_advance} = this.arch.attrs;
                this.search_advance = [1, "1", "True", true].includes(search_advance);
                this.search_domain = {};
            }
        },
        facetRemove: function (facets) {
            facets.map((name) => {
                delete this.search_domain[name];
            });
        },
        prepareSearchData: function (field, data) {
            const {type, string, name} = field;
            var domain = [], description = null;
            if (["char", "float", "int", "monetary", "selection"].includes(type) && data) {
                domain.push([name, 'ilike', data]);
                description = `${string} equal ${data}`;
            } else if (["date", "datetime"].includes(type) && data) {
                domain.push([name, '>=', data.server.start]);
                domain.push([name, '<=', data.server.end]);
                description = `${string} is between ${data.client.start} and ${data.client.end}`;
            } else if (["many2one", "many2many"].includes(type) && data && data.length) {
                domain.push([name, 'in', data.map((item) => item.id)]);
                description = `${string} filter`;
            }
            if (!domain.length) {
                return false;
            }
            return {
                type: 'filter',
                description: description || "Filter",
                search_advance: name,
                domain: Domain.prototype.arrayToString(domain)
            };
        },
        onChangeSearch: function (field, data) {
            // const controller = this.getParent(), controlPanel = controller._controlPanel;
            // if (controlPanel) {
            const {name} = field, filter = this.prepareSearchData(field, data);
            this.getParent().onSearchAdvance({
                filters: filter ? [filter] : [],
                group: (this.search_domain[name] || {}).group
            });
            // controlPanel.renderer.searchBar.trigger_up('facet_replace', {filters: filter ? [filter] : [],
            //     group: (this.search_domain[name] || {}).group});
            delete this.search_domain[name];
            if (filter) {
                this.search_domain[name] = {value: data};
                this.search_domain[name].group = {
                    activeFilterIds: [filter.id],
                    filters: [filter], id: filter.groupId, type: "filter"
                };
            }
            // }
        },
        _freezeColumnWidths: function () {
            const trSearch = this.$el.find(".searchAdvance");
            trSearch.css({display: "none"});
            this._super();
            trSearch.css({display: "table-row"});
        },
        renderSearch: function (node) {
            const name = node.attrs.name, $th = $('<th>'), field = {...this.state.fields[name], name: name},
                withoutFields = ["activity_exception_decoration"], {model} = this.state;
            this.fieldRender = {
                selection: {
                    widget: BasicFields.Selection, funcProps: () => ({
                        label: false,
                        options: field.selection.map((option) => ({label: option[1], value: option[0]}))
                    })
                },
                char: {widget: BasicFields.Input, funcProps: () => ({label: false})},
                float: {widget: BasicFields.Input, funcProps: () => ({label: false, type: "number"})},
                monetary: {widget: BasicFields.Input, funcProps: () => ({label: false, type: "number"})},
                int: {widget: BasicFields.Input, funcProps: () => ({label: false, type: "number"})},
                datetime: {widget: BasicFields.DateRange, funcProps: () => ({label: false, model: model})},
                date: {widget: BasicFields.DateRange, funcProps: () => ({label: false, model: model})},
                many2one: {
                    widget: BasicFields.FieldMany2many, funcProps: () => ({
                        label: false,
                        field: {...field, model: model}, returnObj: true, onChange: field.onChange
                    })
                }
            };

            if (name in this.search_domain) {
                field.value = this.search_domain[name].value;
            }
            if (!field || !field.searchable || !(field.type in this.fieldRender) || withoutFields.includes(field.name)) {
                return $th;
            }
            const fieldRender = this.fieldRender[field.type], {widget, funcProps} = fieldRender;
            field.onChange = (data) => this.onChangeSearch.bind(this)({...field, name: name}, data);
            const fieldWidget = new widget(this, {...field, ...funcProps()});
            fieldWidget.appendTo($th.addClass("wFSearch"));
            return $th;
        },
        _renderHeader: function (isGrouped) {
            let res = this._super(isGrouped);
            if (this.search_advance && !res.find(".searchAdvance").length) {
                let $tr = $('<tr class="searchAdvance">').append(
                    _.map(this.columns, this.renderSearch.bind(this)));
                if (this.hasSelectors) {
                    $tr.prepend($('<th>'));
                }
                res.append($tr);
            }
            return res;
        },
    });
});
