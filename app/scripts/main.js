var template = syntactic.outline(s1, {
    ignore:['VariableDeclarator', 
            'BlockStatement', 
            'Identifier', 
            'Literal', 
            'Line',
            'ExpressionStatement']}
);

var template = new SerializedStructure(s1);
console.log(template.verify(s1p));

syntactic.tokenize(s1).then(function(summary){
    console.log(summary);
});

var spec = syntactic.specify({
    blacklist:{
        Keyword:['for', 'while']
    }
});
spec.verify(s1p).then(function(res){ 
    console.log(res);
});

console.log(syntactic.parse(s1p));




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