import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import EventEmitter from "./EventEmitter";


export default class Resources extends EventEmitter {

    constructor(sources){

        super()

        //Options
        this.sources = sources

        //Setup
        this.items = {}
        this.toLoad = this.sources.length
        this.loaded = 0


        this.setLoader()
        this.startLoading()
    }

    setLoader(){

        this.loader = {}

        this.loader.gltfLoader = new GLTFLoader()
        this.loader.textureLoader = new THREE.TextureLoader()
        this.loader.cubeTextureLoader = new THREE.CubeTextureLoader()
    }

    startLoading(){
        
        //Load each sources 
        for(const source of this.sources){
            if(source.type === 'gltfModel'){
                this.loader.gltfLoader.load(
                    source.path,
                    (file) => {
                        this.sourceLoaded(source, file)
                    }
                )
            } else if (source.type === 'texture'){
                this.loader.textureLoader.load(
                    source.path,
                    (file) => {
                        this.sourceLoaded(source, file)
                    }
                )
            } else if (source.type === 'cubeTexture'){
                this.loader.cubeTextureLoader.load(
                    source.path,
                    (file) => {
                        this.sourceLoaded(source, file)
                    }
                )
            }
        }
    }

    sourceLoaded(source, file){
        this.items[source.name] = file

        this.loaded++

        if(this.loaded === this.toLoad){
            
            this.trigger('ready')
        }
    }
}