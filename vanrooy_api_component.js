// import  VanRooyAPI from "/application/domain/vanrooy_api.mjs"

export default {
    name: "VanRooy API Component",
    key: "vanrooy_api_component",
    type: "action",
    version: "0.0.5",
    description: "Generates endpoints for VanRooy integration.",
    props: {
        mongoDB: {
            type: "app",
            app: "mongodb"
        }
    },
    methods: {},
    hooks: {
        async activate() { },
        async deactivate() { },
        async deploy() { },
    },
    dedupe: "",
    async run(event) {
        var vanrooyAPI = new VanRooyAPI(this, event)
    },
};