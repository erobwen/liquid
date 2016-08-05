
module.exports = {
    test : function (user, session, page) {
        console.log("Request page 'init'");
        liquid.clearDatabase();

        var somePerson = liquid.findEntity({className: 'User'});

        var favourite = createEntity('Category', {name: 'Favourite', description: '', user: user});
        favourite.persist();
        // createEntity('PersistentSelection', {object: favourite, selection: "object"});

        // favourite.persist();

        // page.subscribeTo(favourite);
        // return {}
    }
};