# syntactic
syntactic.js provides an API for static analysis of javascript code intended
for an educational setting. The API allows you to:

1. Whitelist and blacklist syntactic features (such as for loops, 
   while loops, etc.)
2. Test that two code samples share the same geberal structure.

# Installation
This library is currently built for the browser (the npm module may come in the 
future). You can install it with bower install syntactic

# Dependencies
syntactic.js relies on esprima for parsing javascript into an abstract syntax
tree, and Q (for promises) so that the analysis runs asynchronously in a 
non-blocking way.

# Usage

Template Structure Comparison
=============================
syntactic.outline(text) instantiates a SerializedStructure object which contains
a parsed version of the input text. It can then be used to verify other text. 
The verify() method is currently synchronous but will soon be changed to be
asynchronous by returning a promise.

    // syntactic.outline(text1).verify(text2); 

    > var text = '// This is a hint \n' +
                 'while(true){console.log("Hello")};'

    > var template = syntactic.outline(text);
    > console.log(template);

        SerializedStructure{
            hints: Array[3],
            serialized: {
                Program.WhileStatement: Object
                Program.WhileStatement.CallExpression: Object
                Program.WhileStatement.CallExpression.MemberExpression: {
                    2: " This is a hint "
                }
            }
            ...
        }
    > var text2 = 'while(true){};'
    > var result = template.verify(text2);
    > console.log(result)

        Object{
            hints:[
                "This is a hint."
            ],
            missing:[
                "Program.WhileStatement.CallExpression",
                "Program.WhileStatement.CallExpression.MemberExpression"
            ],
            status:false
        }


Whitelist / Blacklist Specification (Asynchronous)
==================================================
Unlike syntactic.outline().verfify(), syntactic.specify().verify() is 
asynchronous. It returns a promise so that it can be run in a non-blocking way. 
In the future syntactic.outline().verify() will also use promises.

You instantiate a Requirements object with syntactic.specify(lists) where lists
is an object containing either whitelist or blacklist or both. The contents of
these options is in the form {TokenType:[token, token, etc.]}

Once instantiated, you can use the object to verify text. verify() returns the
Requirements object with updated status, which equals false if the verification
failed, and flags which contains the offending items:

    > var text = 'while(true){};'
    > syntactic.specify({
            whitelist:{Keyword: ['for']},
            blacklist:{Keyword: ['while']}
        }).verify(text2).then(function(res){
            console.log(res);
      });

        Requirements{
            flags:{
                blacklist:{
                    Keyword:{
                        while: [
                            {
                                end:{...},
                                start:{
                                    column:0,
                                    line:1
                                }
                            }
                        ]
                    }
                },
                whitelist:{
                    Keyword:{
                        for: undefined
                    }
                }
            },
            status: false
        }

