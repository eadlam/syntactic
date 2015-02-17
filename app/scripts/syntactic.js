(function(global) {

    /* syntactic.js provides an API for several operations over an abstract 
     * syntax tree that can be useful for automated testing of a students 
     * javascript code 
     * 
     * Dependencies: esprima.js, q.js
     */


    var syntactic = {};
    global.syntactic = syntactic;


    // This returns a simplified version of the esprima abstract syntax tree
    // 1. For every branch it removes the root node if it has only one child, 
    //    and makes the child the new root node. This repeats until the root 
    //    node has multiple children or is empty 
    // 2. It removes any node that doesn't have a type attribute
    // 3. It renames the node to the value of it's type attribute
    syntactic.parse = function(text){
        var structure = {};
        var _parse = function(branches, branch){
            var names = Object.keys(branches);
            if(branches.hasOwnProperty('type')){
                branch[branches.type] = {};
                var branch = branch[branches.type];
            }
            for(var i in branches){
                if(branches.hasOwnProperty(i)){
                    if(branches[i] && typeof branches[i] === 'object'){
                        _parse(branches[i], branch);
                    }
                }
            }
        };
        _parse(esprima.parse(text, {loc:true}), structure);
        return structure;
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


    // This object parses text using the syntactic.parse method and then 
    // serializes the resulting object into string representations of each 
    // branch. You can specifify nodes to ignore and compare the object to 
    // another object.
    function SerializedStructure(text, options){
        this.structure = syntactic.parse(text);
        this.ignore = options && options.ignore ? options.ignore : null;
        this.serialized = [];

        // do the serialization
        this._serialize(this.structure, "");
    };
    SerializedStructure.prototype._serialize = function(branch, summary){
        if(Object.keys(branch).length === 0){
            this.serialized.push(summary);
        } else {
            for (var name in branch) {
                if(branch.hasOwnProperty(name)){
                    var summaryName = this.ignore && 
                                      this.ignore.indexOf(name) > -1 ? "" : name;
                    var newSummary = "";
                    if(summary === ""){
                        newSummary = summaryName;
                    } else if (summaryName === ""){
                        newSummary = summary;
                    } else {
                        newSummary = summary + "." + summaryName;
                    }
                    this._serialize(branch[name], newSummary);
                }
            };
        }
    };
    SerializedStructure.prototype.verify = function(text){
        
        var testCode = new SerializedStructure(text, {
            ignore:this.ignore
        });

        var info = {
            status: true,
            missing:[]
        };

        for (var i = this.serialized.length - 1; i >= 0; --i) {
            if(testCode.serialized.indexOf(this.serialized[i]) === -1){
                info.status = false;
                info.missing.push(this.serialized[i]);
            }
        };

        return info;
    };

    syntactic.outline = function(example, options){
        return new SerializedStructure(example, options);
    };




    // var template = syntactic.outline(s1, {
    //     ignore:['VariableDeclarator', 
    //             'BlockStatement', 
    //             'Identifier', 
    //             'Literal', 
    //             'ExpressionStatement']}
    // );

    // var template = new SerializedStructure(s1);
    // console.log(template.verify(s1p));

    // syntactic.tokenize(s1).then(function(summary){
    //     console.log(summary);
    // });

    // var spec = syntactic.specify({
    //     blacklist:{
    //         Keyword:['for', 'while']
    //     }
    // });
    // spec.verify(s1p).then(function(res){ 
    //     console.log(res);
    // });

    // console.log(syntactic.parse(s1p));


})(typeof window !== "undefined" ? window : global);

