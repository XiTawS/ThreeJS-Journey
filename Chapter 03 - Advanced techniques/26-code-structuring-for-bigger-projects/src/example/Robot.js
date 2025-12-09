export default class Robot{

    constructor(name, legs) {
    
        this.name = name
        this.legs = legs

        console.log(`I am ${name}, thank you creator`)

        this.sayHi()
    }

    sayHi() {
        console.log(`Hi ! My name is ${this.name}`)
    }
}