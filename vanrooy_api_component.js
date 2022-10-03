import VanRooyAPI from "/application/domain/vanrooy_api.js"

export default {
    name: "VanRooy API Component",
    key: "vanrooy_api_component",
    type: "action",
    version: "0.0.7",
    description: "Generates endpoints for VanRooy integration.",
    props: {
        mongoDB: {
            type: "app",
            app: "mongodb"
        }
    },
    // methods: {},
    // hooks: {
    //     async activate() { },
    //     async deactivate() { },
    //     async deploy() { },
    // },
    // dedupe: "",
    async run($, event) {
        var vanrooyAPI = new VanRooyAPI($, event)
    },
};