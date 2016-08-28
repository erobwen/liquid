![Alt text](/liquid_logotype.png?raw=true "Optional Title")

Full stack web-development framework.

# Dependencies

Liquid uses Node.js Neo4J, React, Express and Socket.io.

![Alt text](/liquid_dependencies.png?raw=true "Optional Title")

# Rationale

Liquid is a **full stack web-development framework** that will make it possible to create high quality web-services/pages to a significantly reduced cost. The purpose of liquid is to do a few VERY important things very well, they are:

1. **Full stack Javascript environment**, which integrates the client, server & database, and allows shared code between server and client.
2. **Continous data structure synchronization**(a) between server/client and peer clients to automatically keep everything in synchronization.
3. **State of the art reactive programming**, with advanced change propagation using **dependency recording**. Allowing you to write code with pure business logic instead of code that updates derived data.
4. **Real OOP for models** with polymorphism, model extension and inheritance etc. for efficient programming and code reuse.
5. **REACT integration**, supporting recursive reactive views. Other UI frameworks could be used, or none, but Liquid comes bundeled with a through REACT integration.

(a) Note: Currently only object-level synchronization is supported, see roadmap.

In addition, Liquid has been built, based upon the following guiding principles:

1. **"Code before constructs"**. In liquid, Javascript code is placed in the lead role. For example, if we are to sort a list, we could either conceive of a fancy ordering language, that allows the programmer to write things such as "order = {alphabetically: 'DESC'}". While such construct can be convenient at times, it is nowhere near as powerful and versitile as a plain Javascript ordering function, that is passed to a general sorting function. such as. order = function(a, b) { return a.name > b.name }. Therefore, in Liquid we primarily use code interfaces to solve problems, rather than limited yet fancy special purpose languages.
2. **Recursion as stresstest**. The possibility of nesting components within other components is very important. When it comes to reactive programming, and reactive creation and updating of UI:s, this is especially important to keep in mind.
3. **No enforced static encapsulation**. Many frameworks tries to mitigate the complexity of the world by enforcing a degree of encapsulation. Components are introduced that has distinct "output" and "inputs" (Angular 2, I am looking at you!). However, many of the more difficult real world problems require algorithms that has easy access to data from various sources, and a too rigid framework will be harmful for this purpose. I believe that complex data-flows only pose a problem if we loose control of them, and by using reactive programming and dependency recording, keeping track of complex dependencies is easier than ever. For example, liquid can ensure that view code does not alter the model by simply write-protecting the model during the view-rendering phase. Liquid therefore has no enforced static encapsulation of any kind. There are just objects, and code that manipulate objects, or build views out of objects.
4. **Only one definition**. Web developers has become acustomed to defining their model in at least three ways. First the database definition, then the accompanying PHP/Java/Python models, and lastly their Json/Javascript representation in the client. With Liquid, there is only ONE single model definition, used for database, server and client!

This is a link to a work in progress document that tries to capture and describe the goals of liquid:

https://docs.google.com/document/d/1GRvU7RE23RzrpRRky8FIEYQon3L4_6x_4LV4AGnnkR0/pub


# Roadmap

The plan for the future is to include the following features.

1. Support for data structure synchronization, currently the synchronization is on object level.
2. Integrated security model based on custom user/object access levels.
3. Client side routing with url/browser navigation support.
4. Object version control.
6. Liquid server clustering. It should be possible to organize Liquid servers in cluster-trees where end users communicate with leafs, and where the cluster tree act as a multi level data-cache.


# Full stack Javascript environment

Web development is often performed using one programming language for the frotend and one for the backend. This often means certain business logics has to be repeated once in each respective language. By using Javascript for both frontend and backend, we make it possible to reuse code between the two. In addition, having the same language on both client and server it makes it easier to synchronize data between the two.

It can also be argued that Javascript is growing into a formidable programming language, with huge potential for the future. Since virtually all browsers on all devices run Javascript, it can be argued that Javascript is perhaps the most widespread programming language in the world, and might even become THE most important programming language in the world.

Javascript also has some strenghts in its own right, besides from beeing widespread. Javascript was developed at a time when compiled languages such as Java and C++ reigned supreme for application development, and it is therefore understandable that borrows much of it syntax, and even parts of its name from Java. The true nature of Javascript however, is more that of a functional and dynamic language like Lisp or ML from the 70'ties, hiding beneath a thin imperative veneer. Webb development has brought a renaissance for dynamic programming languages in general, and Javascript has proven that concepts such as dynamic data structures and lexical closures (functions with encapsulated scope that can be passed around) are extremley powerful, especially when it comes to creating frameworks.

# Continous data structure synchronization

The server and the client are two separate machines, yet is important to bring them together as close as possible, and the method to do so is to provide automatic synchronizaiton of data.

Whenever shared data is written on the client, changes will automatically, without delay, propagate to the server, and whenever shared data is written on the server, changes will automatically propagate to the client. And Liquid makes this automatically for you! This makes Liquid higly suitable for applications where clients needs to share data in realtime, such as chatboards and games. For applications that require distinct "saving" or "reloading", other solutions will be available.

However, it is not enough to just synchronize isolated objects, as data today often consist out of more complex data structures, such as tree, graph or document structures with objects. Liquid also makes it possible to synchronize these, and makes it possible to automatically push added objects either to the client or the server.

The only limitation inherent to all web development is about how the client needs to fetch data asynchronously in the first place, and that there might be a limitation in transfer speed. For this purpose Liquid provides a very versitile system for data-subsription, making it as easy as possible to to control the loading of data into the client. Supporting all kinds of on-demand and lazy loading, including a sensible behavior on the client when data is not loaded.

# State of the art reactive programming

In essence, reactive programming is about only writing code that creates views, but never write code that update those views. Views could be simple renderings of a model, or contain complex data derrived from the model. Changes in the model will then give cause to an automatic update of any view dependent on the changed data.

This is an evolution over traditional models, such as the observer pattern or other kinds of event triggered view updates. With reactive programming, it should be more automatic.

This sounds simple, but in practice there are two inherent hard problems to overcome:

1. Dependency detection. How can we tell what has changed.
2. View updating. How can we update the view when it carries a state.

Dependency detection has traditionally depended on observer patterns, or just having code that knows how to update the corresponing view on some model change. As Angular 1.x was popularized however, the digest loop introduced a new level of reactive programming where the programmer in many cases did not need to write any code that updated the view, or that observed certain data. There were however a limitation in that any data prepared in the controller setup, would not change automatically. Hence there was till a limited need for the observer pattern using $watch. Angular 2 takes one step further towards the observer pattern, with distinct input and output declarations for components.

For dependency detection liquid uses the radical idea of dependency recording, where we simply record any data read by a certain algorithm. I have found out that MobX uses the same technique. Dependency recording has the huge advantage that it puts no resctriction on the view code, allowing any kind of javascript to execute, while it still can maintain pinpoint precision in what view to re-evaluate.

When it comes to reactivley updating a view that already has a state of its own (such as status of buttons pressed, accordions etc), there are two fundamentally different approaches. The first one is to have a view-template driven rendering engine that pulls model data into the view. This semantics makes it inherently easy to know how to integrate a changed part of the view into the existing view. This approach is used heavily by for example Angular 1, but is also present in Angular 2 and React. Since Liquid has support for React itegration, it can use this method to allow reactive view creation/updating, while maintaining the state of the user interface.

The other way to update a view with a state is to create a view object structure where objects has certain view-id:s and then merge the updated view into the existing one. Liquid also has support for this using the "projection" reactive primitive of Liquid.

## Reactive programming in Liquid
In fact, Liquid presents quite a few novel innovations when it comes to reactive programming. The main calls are

    uponChangeDo(doFirstCallback, doOnChangeCallback)

The function in the first argument will be called. Whenever anything that this function reads changes, then the doOnChange is called one single time. The intention is not for the second callback to trigger changes directly, but rather to invalidate in a way that will later cause a new call to uponChangeDo. This is for example used to trigger invalidation of components in REACT, depending on data that was read in their render function.

    repeatOnChange(callback)

The callback given to this function will be executed immedeatley, and upon every change in any data that the callback read, the callback will be called again, continously. This can be used to set up
There is also a possibility of calling a cached method. This means that for no change in read data and given arguments, this method will not reevaluate, but just give a cached return value.

    // Caced version of object.someMethod(a, b);
    object.callCached('someMethod', a, b);

    // Caced version of object.someMethod(a, b); with instant reevaluation.
    object.callReevaluatedCached('someMethod', a, b);

The option of reevaluation will cause the method to only notify readers of the return value of any change, if it is an actual change.

Lastly, the dependency recording of liquid grants a bonus feature. Namley a "blockSideEffects" call that can be used to wrap any Javascript code, so that it is guaranteed not to alter anything in the model. It acts as a global write-protection of liquid models not created within the call itself.


# Real OOP for models

Sometimes development takes two steps forward, and one step back. The shift for application development from compiled languages, to web development and dynamic languages has brought many advances. Yet, one thing seems to have been lost. When programs started to store their data persistently in primarily SQL databases, it became difficoult to transfer the long legacy of OOP from the compiled languages. In the 90'ties all programmers built deep inheritance hierarchies for their models, reusing code on a grand scale. Yet today, this practice almost seems lost. To handle inheritance in an SQL database, the programmer has to resort to either single table inheritance, or multi table inheritance, and neither is any good. Some frameworks tries to offer this as a functionality, but none of them has gained any popularity, perhaps because of the inherent complexity.

What Liquid does, is that it tries to bring back true OOP for models, making it possible to once again build deep class hierarchies for increased code reuse. Currently, a graph database is used to make this possible, without increased complexity, but in the future a liquid/SQL adaptation might be created for supporting legacy projects.


# Folder structure

* Liquid
	* LiquidNeo4JInterface   native Java wrapper for Neo4J (to be removed)
	* public 
		* js
			* liquid  -- The liquid libraries. Used on both client and server.
			* **liquid_application**  -- This is where your application files go. Used on both client and server. 
	* views -- ejs files for your express server. 
	* **liquid.js** -- main starting point for liquid.
	* controllers.js -- Controller definitions. 
	* liquidServer.js -- the part of the framework that only needs to reside on the server.  


# Simple demo videos

This video demonstrates the server/client synchronization in action:
https://www.youtube.com/watch?v=Z6fH0saKj5w

This video demonstrates the power of dependency recording and repeaters:
https://www.youtube.com/watch?v=5gOnmwo2jN4

This video demonstrates playing around with the graph in the Neo4J visual interface:
https://www.youtube.com/watch?v=liCdUjzHfqQ



# Gettings started

Currently, liquid is not packaged as a framework that can be downloaded with npm etc. It is just an experimental repository that can run a simple demo using Node.js.

1. Install Node 6.3.1
2. Install Neo4J 3.0.4
3. Clone the repository to c:\liquid or corresponding
4. Run npm install in this directory. (some warnings and errors, but it should be ok). 
5. Start Neo4J and open the interface. Change the password of user neo4j to "liquid"
6. run "node liquid.js" in the liquid directory.
7. Navigate to: http://localhost:4000/init  (this will populate the database with some data) **WARNING**: This will clean out everything in the database.
8. Navigate to: http://localhost:4000/view


# Liquid/Neo4J Connectivity

There are two options in how to connect to Neo4J. One way is easy, the other one gives higher performance. To toggle between the two modes of operations, change the boolean of the file liquidNeo4JInterface.js, on the following line:
	var useJavaInterface = true;
	
	
## 1 ) Using native Java API for Neo4J connectivity.

UPDATE 1: Because of recent developments with the Bolt driver for javascript connectivity with Neo4J(https://github.com/neo4j/neo4j-javascript-driver), the method of using native Java api to connect to Neo4J will probably be removed. This will simplify things a LOT, and clear up a lot of dependencies in the package.json.

In order to use the much faster Java wrapper for the Neo4J database, it is necessary to install node package 'java'. In order to sucessfully install java however, it is necessary to first install node-gyp, which requires the following steps:

* java 
	* node-gyp
		* Install Java
		* Install Python
		* Install C++ Visual Studio Express 

(see more detailed explanation: https://github.com/nodejs/node-gyp)

We are not kidding, you have to install all three languages on your computer in order to perform this installation. In the future, there will be a native javascript connection to Neo4J, that might simplify this. 

_If you do not wish to use the native java api to connect to Neo4J, then you can comment out the 'java' dependency in the package.json file._



## 2) Use Neo4J rest API. 

WARNING: On windows there are some problems with using the Neo4J REST API when offline. Connecting the computer to a network solves the problem.

The alternative is to connect to Neo4J using its rest api. You then need to install the 'seraph' package.

For this you have to first install 

* seraph
	* Install Neo4J Community Edition. 

Whenever you start your server, you have to manually first start your Neo4J community edition, and start it up with the right database. 

_If you do not wish to use the native java api to connect to Neo4J, then you can comment out the seraph dependency in the package.json file._


# References

http://isomorphic.net/libraries