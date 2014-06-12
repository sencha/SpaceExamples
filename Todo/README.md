# Todo | Space Example

## Space APIs

- [**SecureSQL**](http://docs.sencha.com/space/1.0.0/#!/api/Ext.space.sqlite.Database)
- [**Invoke**](http://docs.sencha.com/space/1.0.0/#!/api/Ext.space.Invoke)

## Dependencies

- [**Sencha Cmd 4.0**](http://www.sencha.com/products/sencha-cmd/download)
- [**Sencha Touch 2.3.0**](http://www.sencha.com/products/touch/)
- [**Sencha Space**](http://www.sencha.com/products/space/) (external)

## Getting Started

### Prerequisites

- [Download](http://www.sencha.com/products/sencha-cmd/download) and install Sencha Cmd
- [Download](http://www.sencha.com/products/touch/download/) and extract Sencha Touch in */touch/* folder

### Initialization

Generate metadata files by executing the following command in the application root directory:

    sencha app refresh

Compile the style with compass in */resources/sass/* directory:

    sencha compass compile

### Compilation

Execute the following command in the sources root directory:

    sencha app build

This will generate a new directory *build/production/App* containing the application compiled scripts and associated resources.
