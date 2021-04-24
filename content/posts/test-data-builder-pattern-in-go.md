+++
date = "2021-03-28"
title = "Test Data Builder Pattern in Go"
slug = "test-data-builder-pattern-in-go"
tags = [
    "go",
    "golang",
    "testing",
]
categories = [
    "golang",
    "testing",
]
+++

#### _The problem is that it's easy to duplicate knowledge in the specifications, processes and programs that we develop, and when we do so, we invite a maintenance nightmare. - The Pragmatic Programmer_

One of the quality attributes that has become more important in modern software
development is _maintainability_. We developers want (and should) write software
that can be read by other people and not just to be read by computers. That may be
the main context in which maintainability manifests itself in software development.
There are other contexts such as software design, in which it is also important.

A second practice in modern software development is writing _automated tests_:
unit tests, functional tests, integration tests, and others. We developers don't
like to introduce bugs in our applications, we don't want to regress our software,
we want to document it and keep a simple design. Automated tests supports us in
all those aspects.

_Maintainability and automated tests_. That is a very important combination that
is generally neglected by software developers. Even that books like _Clean Code_
dedicated an entire chapter about that subject, we still don't hear that much
about having a clean test suite, with test code as clean as production code, and
with a long durability.

The goal of this post is to present a design pattern that can help us a lot in
solving one of the most common problems when we're writing automated tests:
preparing mock data (or test data, as you will). Of course that it will be just
one many practices and patterns that we can add to our toolbox, so that
we can improve the maintainability of the automated tests that we write.

I believe _Test Data Builder Pattern_ had its first appearance in _Growing Object-Oriented
Software Guided By Tests_, written by Steve Freeman and Nat Pryce. The idea is 
very simple: we use an old friend of Gang Of Four, the Builder Pattern, to create
mock data for our automated tests. Still inspired by Gang of Four, let's formalize
the idea a bit more and illustrate it with an example.

#### Example

Let's write test cases for an "application" that recommends a food diet based on
certain characterists such as age, weight, height, country and diseases of someone.
(Yes, I know that a real recommendation app would have variables more relevant
than those). We're going to be writing our app using the Go programming language,
our main function looks like this:

```go
foods := RecommendDiet(person)
```

Of course we're not going to be implementing that function since that's not the
purpose of this example (and since we're not writing a real recommendation 
app :D). But you can imagine that the `person` parameter is of type `Person`,
that has each of the properties mentioned above: age, height, diseases. To make
the example more interesting, let's come up with some business rules that tells
us if a person can or cannot have fast food recommended on her diet:

1. People aged between 10 and 40 can have fast food as a recommendation.
2. People whose BMI falls within normal, aged between 40 and 60, can have fast food as a recommendation.
3. People weighting more than 187 pounds cannot have fast food as a recommendation.
4. People with heart diseases cannot have fast food as a recommendation.
5. In addition to fast food, rice and beans should be recommended to brazillians.

In Golang, it's very common to write tests using [Table-Driven Tests](https://github.com/golang/go/wiki/TableDrivenTests),
it is, we create a table (slice/array) containing the input for our test case
and the expected output. Then we loop over each test case as shown in the example
that follows:

```go
var testCases = []struct {
	description string(b
	input Person
	expected []string
} {
	{
		description: "should recommend fast food for people aged between 10 and 40",
		input: Person: {
			Age: 20
			Height: 0,
			Weight: 0,
			Country: "Brazil"
			Diseases: []string{}
		}
		expected: []string{"fast food"}
	},
	{
		description: "should not recommend fast food for people aged under 10",
		input: Person: {
			Age: 9
			Height: 0,
			Weight: 0,
			Country: "France"
			Diseases: []string{}
		}
		expected: []string{"fast food"}
	}
	{
		description: "should not recommend fast food for people aged over 40",
		input: Person: {
			Age: 41,
			Height: 0,
			Weight: 0,
			Country: "France"
			Diseases: []string{}
		}
		expected: []string{"fast food"}
	}
	{
		description: "should recommend rice, beans and fast food for brazillians",
		input: Person: {
			Age: 10,
			Height: 0,
			Weight: 0,
			Country: "Brazil"
			Diseases: []string{}
		}
		expected: []string{"rice", "beans", "fast food"}
	}
	// we keep creating data and test cases for each business rule
	// ...
}

func TestRecommendDiet(t *testing.T) {
	for _, testCase := range testCases {
		// ... 
	}
}
```

Even that this example hides some code snippets, the problem to be solved by
_Test Data Builder Pattern_ can clearly be observed in the code above. Notice how
we have to create a new `Person` object for each test case, and we generally do that
just to change some specific property value, while the remaining properties are 
just repeated as they are irrelevant to the rule being tested.

Using the _Test Data Builder Pattern_ we do the following:
1. We create a Builder that initializes a `Person` object with default values (those
   can be values that always set the object to a valid state).
2. For every property that is relevant to some test case, we add a `With...()`
   method to set the property value.
3. Finally, we add a `Build()` method, as the original Builder Pattern requires,
   so that the `Person` object can be used by our test cases.

Example:

```go
func NewPersonBuilder() *PersonBuilder {
	builder := &PersonBuilder{}
	builder.person = &Person{
		Age: 20,
		Height: 5.7,
		Weight: 108,
		Country: "France",
		Diseases: []string{}
	}
	return builder
}

type PersonBuilder struct {
	person *Person
}

func (builder PersonBuilder) WithAge(age int) PersonBuilder {
	builder.Age = age
	return builder
}

func (builder PersonBuilder) WithCountry(country string) PersonBuilder {
	builder.Country = country
	return builder
}
```

Refactoring our test cases to use `PersonBuilder`, we have:

```go
var testCases = []struct {
	description string
	input Person
	expected []string
} {
	{
		description: "should recommend fast food for people aged between 10 and 40",
		input: NewPersonBuilder().WithAge(20).Build(),
		expected: []string{"fast food"}
	},
	{
		description: "should not recommend fast food for people aged under 10",
		input: NewPersonBuilder().WithAge(9).Build(),
		expected: []string{"fast food"}
	}
	{
		description: "should not recommend fast food for people aged over 40",
		input: NewPersonBuilder().WithAge(41).Build(),
		expected: []string{"fast food"}
	}
	{
		description: "should recommend rice, beans and fast food for brazillians",
		input: NewPersonBuilder().WithCountry("Brazil").Build(),
		expected: []string{"rice", "beans", "fast food"}
	}
	// ...
}

func TestRecommendDiet(t *testing.T) {
	for _, testCase := range testCases {
		// ... 
	}
}
```

Notice how the tests become much more expressive almost to the point of making
`description` redundant in the test cases. More important than that: if we add,
update or remove any property from `Person`, we don't need to update every single
test case (long live encapsulation <3).

It's important to mention that we are using a small, limited example in which
`Person` has some few properties. In a real production scenario, we could have
objects with tens or even hundreds of properties (yes those objects are probably
not well desinged, but unfortunately they do exist), we could also have many different
business rules that touch different subsests of those properties. 
In those scenarios, _Test Data Builder_ helps us avoid a real mocking hell.

#### Formalization

#### Intention
- Make mock data more maintainable.
- Increase readability of test cases.
- Add a certain level of encapsulation between test cases and production objects.

#### Participants
- **Data type**: can be a struct, class or any production data representation.
- **Builder**: builds data type by using default values and provides useful 
  methods to change specific property values in test cases.
- **Test cases**: use Builder to instantiate new data type objects.

#### Good Usage Scenarios
- Tests with production objects that require  some slight variation in its 
  input values to satistfy the business rule being tested.
