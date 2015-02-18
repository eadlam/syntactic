"use strict";

(function(global) {

    /* syntactic.js provides an API for several operations over an abstract 
     * syntax tree that can be useful for automated testing of a students 
     * javascript code 
     * 
     * Dependencies: esprima.js, q.js
     */


    var syntactic = {};

    global.syntactic = syntactic;



    // Modifications of Esprima methods
    // ================================

    // This returns a simplified version of the esprima abstract syntax tree
    // 1. For every branch it removes the root node if it has only one child, 
    //    and makes the child the new root node. This repeats until the root 
    //    node has multiple children or is empty 
    // 2. It removes any node that doesn't have a type attribute
    // 3. It renames the node to the value of it's type attribute
    syntactic.parse = function(text){
        var structure = {};
        var comments = [];
        var _parse = function(branches, stem){
            if(branches.hasOwnProperty('type')){
                if(branches.type === 'Line'){
                    comments[branches.loc.end.line + 1] = branches.value;
                } else {
                    var lineNo = branches.loc ? branches.loc.start.line : undefined;
                    stem[branches.type] = {line:lineNo};
                    var stem = stem[branches.type];
                }
            }
            for(var i in branches){
                if(branches.hasOwnProperty(i)){
                    if(branches[i] && typeof branches[i] === 'object'){
                        _parse(branches[i], stem);
                    }
                }
            }
        };
        var ast = esprima.parse(text, {loc:true, comment:true});
        console.log(ast);
        _parse(ast, structure);
        return {structure: structure, comments:comments};
    };


    // This method returns the esprima tokens list as a map
    // {Keyword:{for:[ {end: {column:7, line:2}, start: {column:4, line:2}}]}}
    syntactic.tokenize = function(text){

        var deferred = Q.defer();
        
        var dict = {};
        var tokens = esprima.tokenize(text, {loc:true});

        for(var i = tokens.length - 1; i >= 0; --i){
            var token = tokens[i];
            if(!dict.hasOwnProperty(token.type)){
                dict[token.type] = {};
            }
            if( dict[token.type].hasOwnProperty(token.value) ){
                dict[token.type][token.value].push(token.loc);
            } else {
                dict[token.type][token.value] = [token.loc];
            }
        }

        deferred.resolve(dict);

        return deferred.promise;
    };



    // Whitelist / Blacklist Specification
    // ===================================

    // This object is composed of
    //     1. the whitelist/blacklist
    //     2. a "flags" object which contains copies of those items in the 
    //        whitelist/blacklist which were not conformed to
    //     3. a status attribute which is true if the requirements were met and
    //        false if the requirements were not met
    function Requirements(options){
        this.specify(options);
        this.flags = {};
        this.status = true;
    };
    Requirements.prototype._traverse = function(list, fn){
        var tokenTypes = Object.keys(list);
        for (var i = tokenTypes.length - 1; i >= 0; --i) {
            var tokens = list[tokenTypes[i]];
            for (var j = tokens.length - 1; j >= 0; --j) { 
                fn(tokenTypes[i],tokens[j]);
            }
        }
    };
    Requirements.prototype._flag = function(listType, type, value, locs){
        this.status = false;
        if(!this.flags[listType]){
            this.flags[listType] = {};
        }
        if(!this.flags[listType].hasOwnProperty(type)){
            this.flags[listType][type] = {};
        }
        this.flags[listType][type][value] = locs;
    };
    Requirements.prototype.specify = function(options){
        if(options.hasOwnProperty('whitelist')){
            this.whitelist = options.whitelist;
        }
        if(options.hasOwnProperty('blacklist')){
            this.blacklist = options.blacklist;
        }
    }
    // Asynchronous
    Requirements.prototype.verify = function(text){
        var self = this;
        
        var deferred = Q.defer();
        
        syntactic.tokenize(text).then(function(summary){
            if(self.whitelist){
                self._traverse(self.whitelist, function(type, value){     
                    if(!summary[type] || !summary[type][value]){
                        self._flag('whitelist', type, value);
                    }
                });  
            }
            if(self.blacklist){
                self._traverse(self.blacklist, function(type, value){     
                    if(summary[type] && summary[type][value]){
                    self._flag('blacklist', type, value, summary[type][value]);
                }
                });  
            }
            deferred.resolve(self); 
        });
        return deferred.promise;
    };

    // Returns a new requirments object
    syntactic.specify = function(options){
        return new Requirements(options);
    };



    // Comparing code against a template structure 
    // ===========================================

    // This object parses text using the syntactic.parse method and then 
    // serializes the resulting object into string representations of each 
    // branch. You can specifify nodes to ignore and compare the object to 
    // another object.
    function SerializedStructure(text, options){
        var parsed = syntactic.parse(text);
        this.structure = parsed.structure;
        this.hints = parsed.comments;
        this.ignore = options && options.ignore ? options.ignore : null;
        this.serialized = {};

        // do the serialization
        this._serialize(this.structure, "");
    };
    SerializedStructure.prototype._serialize = function(branch, branchName){
        var stems = Object.keys(branch);
        for (var i = stems.length - 1; i >= 0; --i) {
            var stemName = stems[i];
            if(stemName !== 'line'){ // ignore line numbers, they aren't structure
                var name = branchName;
                if(this.ignore.indexOf(stemName) === -1){
                    serial = branchName === "" ? stemName : 
                                                 branchName + "." + stemName;
                }
                // end of the branch
                if(Object.keys(branch[stemName]).length === 1){ 

                    if(stemName === 'Line'){ 
                        console.log(branch[stemName]);
                    } else {
                        var line = branch[stemName].line;
                        if(! this.serialized.hasOwnProperty(name)){ 
                            this.serialized[name] = {};
                        }
                        this.serialized[name][line] = this.hints[line]; 
                        
                    }
                } else {
                    this._serialize(branch[stemName], serial);
                }
            }
        };
    };

    // Checks to see if a new block of codes matches the structure of this one.
    SerializedStructure.prototype.verify = function(text){
        
        // serialize the users code
        // filter the same nodes as the template
        var userCode = new SerializedStructure(text, {
            ignore: this.ignore 
        });

        // This is what gets returned
        var info = {
            status: true,
            missing:[],
            hints:[]
        };

        // iterate over the template structure, checking that each branch
        // exists in the users structure
        for (var branchName in this.serialized) {

            // if user code is missing the branch
            if(!userCode.serialized.hasOwnProperty(branchName)){

                // record the problem
                info.status = false;
                info.missing.push(branchName);

                // get the hint
                var lines = this.serialized[branchName];
                for (var i in lines) {
                    var hint = lines[i];
                    if(hint){
                        info.hints.push(hint);
                    }
                };
            }
        };

        return info;
    };


    // Public API method
    syntactic.outline = function(example, options){
        return new SerializedStructure(example, options);
    };


})(typeof window !== "undefined" ? window : global);

