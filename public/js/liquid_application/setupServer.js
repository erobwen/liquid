
liquid.liquidControllers = {
    'index': 'LiquidPage',
    'test': createTestPage,
    // 'test': create,
    'someurl/:someargument' : 'PageWithArgument'
};


/***
 * Setup some test data
 */

// !function addTestData() {
// User
var user = create('User', {name: "Some Person", email: "some.person@gmail.com" });


// Create categories
var favourite = create('Category', {name: 'Favourite', description: '', user: user});

var funny = create('Category', {name: 'Funny', description: '', user: user});

var politics = create('Category', {name: 'Politics', description: '', user: user});

var georgism = create('Category', {name: 'Georgism', description: '', user: user});
politics.addSubCategory(georgism);

var myPolitics = create('Category', {name: 'MyPoliticalCommitments', description: '', user: user});
politics.addSubCategory(myPolitics);

var directDemocracy = create('Category', {name: 'Direct Democracy', description: '', user: user});
politics.addSubCategory(directDemocracy);

var liquidDemocracy = create('Category', {name: 'Liquid Democracy', description: '', user: user});
directDemocracy.addSubCategory(liquidDemocracy);

var direktdemokraterna = create('Category', {name: 'Direktdemokraterna', description: '', user: user});
liquidDemocracy.addSubCategory(direktdemokraterna);
myPolitics.addSubCategory(direktdemokraterna);

// Create References
var created = 0;
while (created++ < 3) {
    var reference1 = create('Reference', {url : 'http://foo.com/' + created, user: user, category:georgism});
}

// created = 0;
// while (created++ < 10) {
    // var reference2 = create('Reference', {url : 'http://fie.com/' + created, user: user, categories:[georgism, liquidDemocracy]});
// }
// created = 0;
// while (created++ < 10) {
    // var reference3 = create('Reference', {url : 'http://fum.com/' + created, user: user, category: direktdemokraterna});
// }
// created = 0;
// while (created++ < 10) {
    // var reference4 = create('Reference', {url : 'http://foobarkazong.com/'  + created, user: user, category: direktdemokraterna});
// }
// }();

function createTestPage(req) {
    var page = create('LiquidPage');
    page.addSubsription(create('Subscription', {object: user, selector:'all'}));
    return page;
}
