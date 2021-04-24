+++
date = "2021-03-28"
title = "Test Data Builder Pattern em Go"
slug = "test-data-builder-pattern-em-go"
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

Um dos atributos de qualidade que vem se tornando mais importante no
desenvolvimento de software moderno é a _manutenibilidade_. Nós desenvolvedores
queremos (e devemos) escrever software que possa ser lido por outras pessoas e não
apenas pelo computador. Esse talvez seja o principal contexto em que a manuteniblidade
se manifesta no desenvolvimento de um software. Existem outros contextos, como por 
exemplo design de software, em que ela também é importante.

Uma segunda prática no desenvolvimento de software moderno é escrever _testes 
automatizados_: testes de unidades, testes funcionais, testes de integração
e outros. Nós desenvolvedores não gostamos de introduzir bugs em nossas aplicações,
não queremos regredir nosso software, queremos documentá-lo e manter o design
simples. Testes automatizados nos suportam em todos esses pontos.

_Manutenibilidade e testes automatizados_. Essa é uma combinação bastante importante,
mas geralmente negligenciada pelos desenvolvedores. Mesmo que o livro Clean Code
tenha dedicado um capítulo inteiro sobre o tema, ainda não se ouve falar tanto
sobre ter uma suíte de testes limpos, com código tão legível quanto o código
de produção e que tenha uma durabilidade longa.

O objetivo desse post é apresentar um design pattern que pode nos ajudar bastante
em um dos problemas mais comuns quando vamos escrever testes automatizados: 
preparar mock data (ou dados de testes, como preferir). Claro, essa é apenas uma 
de diversas práticas e patterns que podemos adicionar na nossa caixa de ferramentas 
para melhorar a manutenibildade de nossos testes automatizados.


Acredito que a primeira aparição do _Test Data Builder Pattern_ é no livro _Growing
Object-Oriented Software Guided By Tests_, escrito por Steve Freeman e Nat Pryce.
A ideia é muito simples: utilizar um dos velhos amigos do Gang of Four, o Builder
Pattern, para criarmos mock data em nossos testes automatizados. Mas seguindo
os passos do Gang Of Four mais uma vez, vamos formalizar essa ideia um pouco 
mais e ilustrá-la com um exemplo.


#### Example

Vamos escrever casos de testes para uma "aplicação" que recomenda
uma dieta de alimentos baseando-se em características como idade, peso, altura, 
país e doenças de uma pessoa (Sim, um sistema de recomendações de 
verdade teria variáveis mais relevantes do que essas). Vamos escrever nosso 
sistema na linguagem de programação Go, a nossa função principal será utilizada 
da seguinte forma:

```go
foods := RecommendDiet(person)
```

Claro, não vamos implementar essa função de verdade, já que não é o foco desse 
exemplo (e já que não é um sistema de recomendações de verdade :D). Além disso, 
imagine que o parâmetro `person` seja do tipo `Person`, que possui cada uma das 
propriedades mencionadas acima: idade, altura, doenças, etc. Para deixar o exemplo 
mais interessante, vamos inventar algumas regras de negócio para a nossa aplicação
que indicam se a pessoa poderá consumir ou não fast food em sua dieta:

1. Pessoas entre 10 e 40 anos podem ter fast food como recomendação.
2. Pessoas com IMC classificado normal, entre 40 e 60 anos, podem ter fast food como recomendação.
3. Pessoas com mais de 85 kg não podem receber recomendações de fast food.
4. Pessoas com doenças cardíacas não podem receber recomendações de fast food.
5. Além de fast food, arroz e feijão deve estar presente na recomendação para brasileiros.

Em Go, é bastante comum escrevermos testes utilizando [Table-Driven Tests](https://github.com/golang/go/wiki/TableDrivenTests),
ou seja, criamos uma tabela (slice/array) com o input do caso de teste e o
output esperado. Então, iteramos por cada caso de teste, como mostra o exemplo
a seguir:


```go
var testCases = []struct {
	description string
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

Apesar do exemplo ocultar alguns trechos de código, o problema a ser resolvido 
pelo _Test Data Builder Pattern_ já pode ser observado no trecho acima. Note como temos
que criar um novo objeto pessoa para cada caso de teste, e geralmente fazemos isso 
apenas para alterar o valor de uma única propriedade, sendo que os demais valores se
repetem já que são irrelevantes para a regra sendo testada.

Com o _Test Data Builder Pattern_ fazemos o seguinte: 
1. Criamos um Builder que inicializa um objeto `Person` com valores default (em 
  geral, os valores default podem ser valores que deixem o objeto `Person` em um 
  estado válido). 
2. Para cada propriedade que for relevante para um caso de teste, adicionamos um 
  método `With...()`.
3. Adicionamos um método `Build()`, como manda o padrão Builder original, que
  retorna o objeto `Person` para ser utilizado no caso de teste.
  
  
Exemplo:

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

Refatorando nossos casos de testes para utilizar `PersonBuilder`, temos:

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

Veja como os testes se tornam mais expressivos quase ao ponto de deixar a propriedade 
`description` redundante nos casos de testes. Mais importante do que isso:
se adicionarmos, removermos ou alterarmos alguma propriedade da struct `Person`, 
não precisaremos atualizar cada um dos casos de testes (long live encapsulation <3).

É importante notar que estamos utilizando um exemplo limitado, em que a estrutura 
`Person` possui poucas propriedades. Em um cenário mais real, podemos ter objetos 
com dezenas ou até centenas de propriedades (sim, esses objetos provavelmente 
possuem mais reponsabilidade do que deveriam, mas infelizmente existem), além
de dezenas de regras de negócios que misturam diversas propriedades. Nesses
cenários, o _Test Data Builder Pattern_ nos ajudaria a evitar um verdadeiro mocking hell.  

#### Formalization

#### Intention
- Tornar mock data mais manutenível.
- Aumentar a legibilidade de casos de testes.
- Adicionar um certo nível de encapsulamento entre nossos testes e nossos 
  objetos de produção.

#### Participants
- **Data type**: representa um tipo de dado (pode ser uma struct, class)
- **Builder**: constrói objeto de produção utilizando valores default e providenciando
  métodos úteis para alterar propriedades nos casos de testes.
- **Test cases**: utilizam o Builder para construir um novo objeto de produção.

#### Good Usage Scenarios
- Testes que envolvem objetos de produção com muitas propriedades, sendo necessário
um objeto de produção com uma pequena variação nos valores de suas propriedades,
para cada novo caso de uso.
