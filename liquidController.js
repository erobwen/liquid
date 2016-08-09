
module.exports = {
    test : function (user, session, page) {
        console.log("Request page 'init'");
        liquid.clearDatabase();

        var somePerson = liquid.findEntity({className: 'User'});

        var favourite = createPersistentEntity('Category', {name: 'Favourite', description: '', user: user});
        favourite.persist();
        // createPersistentEntity('PersistentSelection', {object: favourite, selection: "object"});

        // favourite.persist();

        // page.subscribeTo(favourite);
        // return {}
    }
};