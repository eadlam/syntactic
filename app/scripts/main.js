var f1 = function(n){                   
    for(var i = n; i > 0; i--){  
        if(true){
            console.log("Even!")
        }       
        console.log("[f1] Count: ", i); 
    }};
var f1p = function(n){   
    var status = n - 2;                
    for(var i = n; i > 0; i--){  
        var x = 3;
        if(status){
            console.log("Even!");
            while(x > i){
                console.log("Status:", status);
               x--; 
            }
        }       
        console.log("[f1] Count: ", i); 
    }};
var s1 = "var f1 = " + f1.toString() ;
var s1p = "var f1p = " + f1p.toString() ;

var f2 = function(n){
    while(n > 0){
        console.log("[f2] Count: ", n);
        n--;
    }
};

var f3 = function(n){
    if(n > 0){
        console.log("[f3] Count: ", n);
        f3(n - 1);
    }
};

var s1 = "var f1 = function(n){         \n"+                  
    "for(var i = n; i > 0; i--){        \n"+ 
        "if(i%2 === 0){console.log('even!')}; \n" +     
        "console.log('[f1] Count: ', i); \n"+
    "}                                   \n"+
"};                                      \n"




function Bag(){
    this._object = {};
    this._summary = [];
    this._exclude = ['VariableDeclarator', 'BlockStatement', 'Identifier', 'Literal', 'ExpressionStatement'];
}
Bag.prototype.collect = function(branches){
    var self = this;
    var _collect = function(branches, branch){
        var names = Object.keys(branches);
        if(branches.hasOwnProperty('type')){
            branch[branches.type] = {};
            var branch = branch[branches.type];
        }
        for(var i in branches){
            if(branches.hasOwnProperty(i)){
                if(branches[i] && typeof branches[i] === 'object'){
                    _collect(branches[i], branch);
                }
            }
        }
    };
    var _summarize = function(branch, summary){
        if(Object.keys(branch).length === 0){
            self._summary.push(summary);
        } else {
            for (var name in branch) {
                if(branch.hasOwnProperty(name)){
                    var summaryName = self._exclude.indexOf(name) > -1 ? "" : name;
                    var newSummary = summary === "" ? summaryName : summaryName === "" ? summary : summary + "." + summaryName;
                    _summarize(branch[name], newSummary);
                }
            };
        }
    };
    _collect(branches, self._object);
    _summarize(self._object, "");
}
Bag.prototype.contains = function(template){
    var self = this;
    var info = {
        status: true,
        missing:[]
    };
    for (var i = template._summary.length - 1; i >= 0; --i) {
        if(self._summary.indexOf(template._summary[i]) === -1){
            info.status = false;
            info.missing.push(template._summary[i]);
        }
    };
    return info;

}

var template = new Bag();
// template.collect(esprima.parse(s1));

var bag = new Bag();
bag.collect(esprima.parse(s1p));

// console.log("Bag 1: ", template);
// console.log("Bag 2: ", bag);
// console.log("Compare: ", bag.contains(template));

// This converts the list of tokens into a hashmap in the style:
// {TokenType:{TokenValue:Count}}
var summarize = function(text){
    var dict = {};
    var tokens = esprima.tokenize(text); 
    for(var i = 0; i < tokens.length; ++i){
        var token = tokens[i];
        if( token.type in dict){
            if(token.value in dict[token.type]){
                dict[token.type][token.value] += 1;
            } else {
                dict[token.type][token.value] = 1;
            }
        } else {
            dict[token.type] = {};
            dict[token.type][token.value] = 1;
        }
    }
    return dict;
}

var verify = function(text, options){

    var summary = summarize(text);

    var info = {
        status:true,   // Assume the text conforms
        whitelist: {}, // items it's missing
        blacklist: {}  // items it includes (but shouldn't)
    };
    var _inSummary = function(type, value){
        var result = false;
        if(summary[type] && summary[type][value]){
            result = true;
        } 
        return result;
    };
    var _traverse = function(list, fn){
        var types = Object.keys(list);
        for (var i = types.length - 1; i >= 0; --i) {
            var types = Object.keys(list);
            var type = types[i];
            var values = list[type];
            for (var j = values.length - 1; j >= 0; --j) { 
                var value = values[j];
                fn(type,value);
            }
        }
    };
    var _push = function(list, type, value){
        if(!list[type]){
            list[type] = [value];
        } else {
            list[type].push(value);
        }
    };

    if(options){ // catch missing options
        if(options.whitelist){ 
           _traverse(options.whitelist, function(type, value){
                if(!summary[type] || !summary[type][value]){
                    info.status = false;
                    _push(info.whitelist, type, value);
                }
           }); 
        }
        if(options.blacklist){ 
           _traverse(options.blacklist, function(type, value){
                if(summary[type] && summary[type][value]){
                    info.status = false;
                    _push(info.blacklist, type, value);
                }
           }); 
        } 
        if(!options.blacklist && !options.whitelist){
            throw "this method requires options [whitelist and/or blacklist]"
        }
    } else {
        throw "this method requires options [whitelist and/or blacklist]"
    }
    // console.log(info);
    return info;
};

var dict = summarize(s1);
var info = verify(s1, {
    whitelist: {
        Keyword:['for'],
        Keyword:['var'],
    },
    blacklist: {
        Keyword:['while']

    }
});
// console.log(dict);
// console.log(info);
// console.log(esprima.parse(s1));