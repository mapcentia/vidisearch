'use strict';

/**
 * @type {*|exports|module.exports}
 */
var React = require('react');

var ReactDOM = require('react-dom');

var cloud;

var utils;

var mapObj;

var exId = "mainSearch";

var backboneEvents;

var _searchers = {};

var _lastBounds;

module.exports = {
    set: function (o) {
        cloud = o.cloud;
        utils = o.utils;
        backboneEvents = o.backboneEvents;
        mapObj = cloud.get().map;

    },
    /**
     * Searchers will call this function to register themeselves.
     *
     * @argument searcher
     * {
     *  "key" : "dawa",
     *  "obj" : {"searcher" : this, "title":"Adresser"} 
     * }
     */
    registerSearcher: function (searcher) {
        _searchers[searcher['key']] = searcher['obj'];
    },

    init: function () {
        utils.createMainTab(exId, __("Search"), __("Her kan du søge i rapporterne. I feltet skrives de ønskede søgeord. Der søges fra venstre side af hele ord. Fx for at finde ordet 'kviksølv', starter du med at skrive 'kvik...' og der vil dukke rapporter op med ord, som starter med 'kvik'. Hvis der skrives 'sølv', vil ordet 'kviksølv' ikke blive fundet."), require('./../../../browser/modules/height')().max);

        var currentSearcher = {};

        class SearchItem extends React.Component {
            constructor(props) {
                super(props);

                this.state = {
                    hover: false
                };
                this.hoverOn = this.hoverOn.bind(this);
                this.hoverOff = this.hoverOff.bind(this);
            }

            hoverOn() {
                this.setState({hover: true});
            }

            hoverOff() {
                this.setState({hover: false});
            }

            render() {
                let liStyle = {
                    padding: '4px 16px'
                };
                return <a
                    href="#"
                    style={liStyle}
                    id={this.props.searcher + ':' + this.props.id}
                    className="list-group-item"
                    onMouseEnter={this.hoverOn}
                    onMouseLeave={this.hoverOff}
                >
                    {this.props.value} {this.props.count ? " (" + this.props.count + ")" : ""}
                </a>;
            }


        }

        class SearchList extends React.Component {

            constructor(props) {
                super(props);
                // this.searcher = this.props.searcher;

                this.state = {
                    items: this.props.items
                };
            }

            render() {
                const items = this.props.items;
                let me = this;
                let searchItems;

                if (items.length > 0) {
                    searchItems = items.map((item, index) => {
                            if (item.id === null) return;
                            return (<SearchItem key={index + ':' + me.props.searcher + ':' + item.id}
                                                id={item.id.toString()}
                                                searcher={me.props.searcher}
                                                value={item.title}
                                                count={me.props.count}
                            />)
                        }
                    );

                    return (
                        <div onClick={this.props.onAdd} onMouseOver={this.props.onMouseOver}
                             onMouseOut={this.props.onMouseOut} className="list-group">{searchItems}</div>
                    );

                } else {
                    searchItems = [<div key="d" className="list-group"><i style={{"padding": "4px 16px"}}>-</i></div>]
                    return (
                        <div className="list-group">{searchItems}</div>
                    );
                }
            }
        }

        class SearchersList extends React.Component {
            constructor(props) {
                super(props);
                this.state = {
                    searchers: this.props.searchers
                }
            }

            render() {
                const searchers = this.props.searchers;
                const list = searchers.map(searcher => {
                    return <Searcher key={searcher}
                                     searcher={searcher}
                    />;
                });
                return <div key={list} className="list-group">{list}</div>;
            }
        }

        class Searcher extends React.Component {
            constructor(props) {
                super(props);
            }

            render() {
                let liStyle = {
                    padding: '4px 16px'
                };
                return <a
                    href="#"
                    style={liStyle}
                    id={this.props.searcher}
                    className="list-group-item"
                >
                    {this.props.searcher}

                </a>;
            }
        }

        class MainSearch extends React.Component {
            constructor(props) {
                super(props);

                this.state = {
                    currentSearcherName: '',
                    dataReady: false,
                    searchTerm: '',
                    searchResults: {},
                    searchReady: false,
                    searchDetailReady: false,
                    reset: true,
                    searchRes: <div></div>
                };

                this.searchers = _searchers;

                this.handleChange = this.handleChange.bind(this);
                this.handleCheck = this.handleCheck.bind(this);
                this.handleClick = this.handleClick.bind(this);
                this.handleMouseOver = this.handleMouseOver.bind(this);
                this.handleMouseOut = this.handleMouseOut.bind(this);
                this.handleSearcherClick = this.handleSearcherClick.bind(this);
                this.selectSearcher = this.selectSearcher.bind(this);

            }

            componentWillMount() {
                this.delayedCallback = _.debounce(function (e) {
                    // `e.target` is accessible now
                    var me = this;
                    let val = e.target.value;
                    let _res = {}; //Object.assign({}, me.state.searchResults);
                    me.setState({searchTerm: val});
                    let currentSearchers = {};
                    if (this.state.currentSearcherName) {
                        currentSearcher[this.state.currentSearcherName] = this.searchers[this.state.currentSearcherName];
                    }
                    if (Object.keys(currentSearcher).length > 0) {
                        currentSearchers = currentSearcher;
                    } else {
                        currentSearchers = me.searchers;
                    }
                    me.doSearch(this.state.currentSearcherName, val);
                }, 400);
            }

            reset() {
                this.setState({
                    reset: true
                });
            }

            renderListOfSearchers() {
                let searcherNames = Object.keys(this.searchers);
                return <SearchersList searchers={searcherNames}/>;
            }


            handleSearcherClick(e) {
                this.setState({
                    currentSearcherName: ''
                });
                // Refresh search
                console.log("SEARCH");
                cloud.get().map.fitBounds(_lastBounds);
                this.doSearch('', this.state.searchTerm);
            }

            handleMouseOver(e) {
                let me = this;
                let _searcher, searchTerm;
                [_searcher, searchTerm] = e.target.id.split(':');
                let searcher = this.searchers[_searcher]['searcher'];
                /*
                    set the currentSearcher. From now on, only this searcher will be called
                    when the user writes in the input box.
                */
                // console.log('currentSEarhcer :' + _searcher);
                //me.setState({currentSearcherName: _searcher});

                currentSearcher[_searcher] = this.searchers[_searcher];
                if (searcher.handleMouseOver !== undefined) {
                    searcher.handleMouseOver(searchTerm).then(
                        (res) => {

                        },
                        (res) => {
                            console.error(res)
                        }
                    );

                }
            }

            handleMouseOut(e) {
                let me = this;
                let _searcher, searchTerm;
                [_searcher, searchTerm] = e.target.id.split(':');
                let searcher = this.searchers[_searcher]['searcher'];
                /*
                    set the currentSearcher. From now on, only this searcher will be called
                    when the user writes in the input box.
                */
                // console.log('currentSEarhcer :' + _searcher);
                //me.setState({currentSearcherName: _searcher});

                currentSearcher[_searcher] = this.searchers[_searcher];
                if (searcher.handleMouseOut !== undefined) {
                    searcher.handleMouseOut(searchTerm).then(
                        (res) => {

                        },
                        (res) => {
                            console.error(res)
                        }
                    );

                }
            }

            handleClick(e) {
                let me = this;
                let _searcher, searchTerm;

                _lastBounds = cloud.get().map.getBounds();

                [_searcher, searchTerm] = e.target.id.split(':');
                let searcher = this.searchers[_searcher]['searcher'];
                /*
                    set the currentSearcher. From now on, only this searcher will be called 
                    when the user writes in the input box.
                */
                // console.log('currentSEarhcer :' + _searcher);
                me.setState({currentSearcherName: _searcher});

                currentSearcher[_searcher] = this.searchers[_searcher];
                searcher.handleSearch(searchTerm).then(
                    (res) => {
                        me.setState({searchRes: res});
                        me.setState({searchReady: false});
                        me.setState({searchDetailReady: true});
                    },
                    (res) => {
                        console.error(res)
                    }
                )
            }

            selectSearcher(e) {
                let me = this; //console.log(me);
                // console.log(e.target.id);
                let _searcher = e.target.id.split(':')[0];
                // let searcher = _searchers[_searcher]['searcher']; console.log(searcher);
                let searcher = {};
                searcher[_searcher] = _searchers[_searcher];
                me.setState({currentSearcherName: _searcher});
                me.doSearch(_searcher, me.state.searchTerm);
            }

            handleChange(e) {
                e.persist();
                this.delayedCallback(e);
            }

            handleCheck(e) {
                this.doSearch(this.state.currentSearcherName, this.state.searchTerm)
            }

            doSearch(searcherName, _searchTerm) {
                let currentSearchers = {};

                if (searcherName === '') {
                    currentSearchers = this.searchers;
                } else {
                    currentSearchers[searcherName] = this.searchers[searcherName];
                }
                this.setState({searchResults: {}});
                let me = this;
                let _res = {};
                Object.keys(currentSearchers).map((key) => {
                    currentSearchers[key]['searcher'].search(_searchTerm).then(
                        function (fulfilled) {
                            _res[key] = fulfilled;
                            me.setState({searchResults: _res});
                            me.setState({searchReady: true});
                            me.setState({reset: false});
                        },
                        function (err) {
                            console.error(err);
                        });
                })
            }

            /**
             *
             * @returns {XML}
             */
            render() {

                let searchRes = this.state.searchRes;
                let searcherButton = '';
                let checkStyle = {
                    marginRight: '30px'
                };
                if (this.state.searchReady) {

                    let _keys = Object.keys(this.state.searchResults);
                    let _length = _keys.length;

                    let hitsList1 = _keys.map(key => {
                        let temp = [{id: 'all', title: this.searchers[key]['title']}];
                        return <SearchList key={key} items={temp} searcher={key} onAdd={this.selectSearcher}/>;

                    });

                    let searchRes1 = _keys.map((key) => {
                        let temp = [{id: 'all', title: this.searchers[key]['title']}];
                        let _items = _length === 1 ? this.state.searchResults[key] : this.state.searchResults[key].slice(0, 10);
                        if (_length === 1) {
                            hitsList1 = '';
                        }
                        let t = <div key={key}>
                            <h5>
                                <SearchList items={temp} searcher={key} onAdd={this.selectSearcher}
                                            count={_items.length}/>
                            </h5>
                            <SearchList items={_items}
                                        searcher={key}
                                        onAdd={this.handleClick}
                                        onMouseOver={this.handleMouseOver}
                                        onMouseOut={this.handleMouseOut}
                            />
                        </div>;
                        return t;
                    });

                    if (this.state.reset) {
                        searchRes = <div></div>;
                    } else {
                        searchRes = <div>
                            <div>{searchRes1}</div>
                        </div>;
                    }
                }

                if (this.state.currentSearcherName) {
                    searcherButton = <button type="button" onClick={this.handleSearcherClick} className="btn btn-info">
                        {this.state.currentSearcherName} <span className="glyphicon glyphicon-remove"></span>
                    </button>
                } else { //console.log('searcherName empty');
                }

                return (
                    <div>
                        <span className="togglebutton" style={checkStyle}>
                            <label><input id="search_tags"
                                          type="checkbox" onChange={this.handleCheck} />Tags
                            </label>
                        </span>
                        <span className="togglebutton" style={checkStyle}>
                            <label><input id="search_omraade"
                                          type="checkbox" onChange={this.handleCheck} />Område
                            </label>
                        </span>
                        <span className="togglebutton" style={checkStyle}>
                            <label><input id="search_text"
                                          type="checkbox" onChange={this.handleCheck} />Tekst
                            </label>
                        </span>
                        <div role="tabpanel">
                            <div className="form-group">
                                <input id="my-search" className="custom-search typeahead" type="text"
                                       placeholder="Search" onChange={this.handleChange}>
                                </input>
                                {searcherButton}
                            </div>
                            {searchRes}
                        </div>
                    </div>
                );
            }
        }

        try {
            ReactDOM.render(
                <MainSearch/>,
                document.getElementById(exId)
            );
        } catch (e) {
        }
    }
};
