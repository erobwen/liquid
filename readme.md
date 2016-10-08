![Alt text](/documents/liquid_logotype_large.png?raw=true "Optional Title")

Full stack isomorphic and reactive web-development framework.

# Dependencies

Liquid uses Node.js Neo4J, React, Express and Socket.io.

(Neo4J might be replaced with MongoDB in the future)

![Alt text](/documents/liquid_dependencies.png?raw=true "Optional Title")

# Rationale

Liquid is a **full stack isomorphic & reactive web-development framework** that will make it possible to create high quality web-services/pages to a significantly reduced cost. The purpose of liquid is to do a few VERY important things very well, they are:

1. **Full stack isomorphic Javascript environment**, which integrates the client, server & database, and allows shared code between server and client. (see http://isomorphic.net/)
2. **Continous data structure subscription and synchronization**(a) between server/client and peer clients to automatically keep everything in synchronization.
3. **State of the art reactive programming**, with advanced change propagation using **dependency recording**. Allowing you to write code that never explicitly updates views or derrived data (see https://en.wikipedia.org/wiki/Reactive_programming). The extensive reactive programming library contains the following powerful primitives: uponChangeDo, repeatOnChange, callCached, callCachedPersistent, withoutSideEffects, infuse, project.
4. **Reactive to the core**, In addition to offer reactive programming primitives for the application, react also utilizes these for its core functionality.
    * **Reactive data subscriptions**. What data is pushed to the client responds reactivley to changes in data.
    * **Reactive security model**.  The visibility and writeability of objects for a particular user changes reactivley.
    * **Reactive databases**. Traditional database handling depend on queries and streamed results. However, a result stream is inherently non-reactive as already read elements might already have changed. Instead, liquid features reactive search queries that reactivley updates the search result of a query.
5. **Custom indexes**. Database-indexes might be highly application dependent. Whether you need augmented database indexes, or indexes of some specific kind, you can always implement your own reactive index (search tree) nodes on top of Liquid to facilitate your needs. There are two reasons for this, the first is to allow higher flexibility. The second reason is that databases today are generally non-reactive, so Liquid needs to implement its own reactive search indexes anyway, to support reactive selection over large sets.
6. **Integrated security model**. The access relation between any user/object can be defined as "noAccess", "readOnly" or "readAndWrite".
7. **Integrated version control** All objects can be subject to version control (comming soon)
8. **Real OOP for models** with polymorphism, model extension and inheritance etc. for efficient programming and code reuse.
9. **REACT integration**, supporting recursive reactive views. Other UI frameworks could be used, or none, but Liquid comes bundeled with a through REACT integration.

In addition, Liquid has been built, based upon the [here](documents/guiding_principles.md) guiding principles.


# Continous data structure synchronization

The server and the client are two separate machines, yet is important to bring them together as close as possible, and the method to do so is to provide automatic synchronizaiton of data structures.

![Alt text](/documents/data_structure_synchronization.png?raw=true "Optional Title")

Whenever shared data is written on the client, changes will automatically, without delay, propagate to the server, and whenever shared data is written on the server, changes will automatically propagate to the client. And Liquid makes this automatically for you! This makes Liquid higly suitable for applications where clients needs to share data in realtime, such as chatboards and games. For applications that require distinct "saving" or "reloading", other solutions will be available.

However, it is not enough to just synchronize isolated objects, as data today often consist out of more complex data structures, such as tree, graph or document structures with objects. Liquid also makes it possible to synchronize these, and makes it possible to automatically push added objects either to the client or the server.

The only limitation inherent to all web development is about how the client needs to fetch data asynchronously in the first place, and that there might be a limitation in transfer speed. For this purpose Liquid provides a very versitile system for data-subsription, making it as easy as possible to to control the loading of data into the client. Supporting all kinds of on-demand and lazy loading, including a sensible behavior on the client when data is not loaded.

Read more about this topic [here](documents/more_about_data_structure_synchronization.md)

# State of the art reactive programming

In essence, reactive programming is about:

*Only writing code that creates views and derrived data/models, but never write code that update those artifacts.* I we write code such as:

     x = y + z
*x should automatically update on any change of y or z. Moreover, we should not even have to write code that listens to, observes or in any other way detects changes in y or z. **The change detection and updating should be completley automatic***

In practice there are two inherent hard problems to overcome:

1. **Dependency detection**. How can we tell what has changed.
2. **View updating**. How can we update the view when it carries a state.

Liquid builds on a 10+ years legacy of original research into reactive programming and provides a state of the art solutions to each of these problems.

#### Dependency Detection ####
Dependency detection has traditionally depended on **observer pattern**, or just having code that knows how to update the corresponing view on some model change. As Angular 1.x was popularized however, the **digest loop** introduced a new level of reactive programming where the programmer in many cases did not need to write any code that updated the view, or that observed certain data. There were however a limitation in that any data prepared in the controller setup, would not change automatically. Hence there was till a limited need for the observer pattern using $watch. Angular 2 takes one step further towards the observer pattern, with distinct input and output declarations for components.

For dependency detection liquid uses the radical idea of **dependency recording**, where we simply record any data read by a certain algorithm. I have found out that MobX uses the same technique.

*Dependency recording has the huge advantage that it puts no resctriction on the view code in terms of what object it reads data from, or what computations it performs in the process, allowing any kind of javascript to execute, while it still can maintain pinpoint precision in what view or derrived data to re-evaluate*.

#### View Updating####
When it comes to reactivley updating a view that already has a state of its own (such as status of buttons pressed, accordions etc), there are two fundamentally different approaches. The first one is to have a **view-template driven rendering** engine that pulls model data into the view. This semantics makes it inherently easy to know how to integrate a changed part of the view into the existing view. This approach is used heavily by for example Angular 1, but is also present in Angular 2 and React. Since Liquid has support for React itegration, it can use this method to allow reactive view creation/updating, while maintaining the state of the user interface.

The other way to update a view with a state is to use a **construct and merge views methodology**. Upon change, a new view structure is created where objects has certain view-id:s that can be matched with view-id:s of any already existing view. The new view structure is merged into the existing one, retaining the identities of the already existing view. Liquid also has support for this using the **projection** reactive primitive of Liquid, which in turn uses the **infusion** concept.

## Reactive programming in Liquid
In fact, Liquid presents quite a few novel innovations when it comes to reactive programming. The reactive primitives are:

* uponChangeDo
* repeatOnChange

In addition, liquid offers the following features that are built upon these primitives:

* callCached & callCachedPersistent
* withoutSideEffects (helper)
* infuse (helper)
* project

Some people might have difficoulty to understand the reactive primitives of liquid due to their simple nature. There is no need to "declare inputs", "define outputs" or setup a rendering pipeline. *With liquid, you simply read a variable in the right situation, in order to register a dependency*. It goes automatically and is integrated into what is normally viewed as the programming language.

#### uponChangeDo ####
Upon change do is the simplest primitive that uses dependency recording, and has a signature as follows:

    uponChangeDo(doFirstCallback, doOnChangeCallback)

With it, it is possible to execute an arbitrary function with recursion, loops etc. Every single piece of data that is read during this dynamic scope of execuion is then beeing recorded, and when any of that data is changed, another function is called one single time. This is for example used to trigger invalidation of components in REACT, depending on data that was read in their render function. Here is an example:


    uponChangeDo(
        function() {
            x.getSomeValue();
            y.performSomeComputation();
            z.iterateADataStructure();
        },
        function() {
            alert("Something has changed!!!");
        });
    x.setSomeValue("newValue"); // This will trigger alert!


#### repeatOnChange ####
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

Sometimes development takes two steps forward, and one step back. The shift for application development from compiled languages, to web development and dynamic languages has brought many advances. Yet, one thing seems to have been lost. When programs started to store their data persistently in primarily SQL databases, it became difficoult to transfer the long legacy of OOP from the compiled languages. In the 90'ties all programmers built deep inheritance hierarchies for their models, reusing code on a grand scale. Yet today, this practice almost seems lost.

To handle inheritance in an SQL database, the programmer has to resort to either single table inheritance, or multi table inheritance, and neither is any good. Some frameworks tries to offer this as a functionality, but none of them has gained any popularity, perhaps because of the inherent complexity.

What Liquid does, is that it tries to bring back true OOP for models, making it possible to once again build deep class hierarchies for increased code reuse. Currently, a schema-less NoSQL database is used to make this possible, without increased complexity. If there is a demand for it, a liquid/SQL adaptation might be created for supporting legacy projects.


# Folder structure

* Liquid
	* LiquidNeo4JInterface   native Java wrapper for Neo4J (to be removed)
	* public
		* js
			* liquid  -- The liquid libraries. Used on both client and server.
			* **liquid/application**  -- This is where your application files go. Used on both client and server.
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
5. ~~Start Neo4J and open the interface. Change the password of user neo4j to "liquid"~~ (database is not used currently)
6. run "node liquid.js" in the liquid directory.
8. Navigate to: http://localhost:4000/test


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