const path = require('path');
const Generator = require('yeoman-generator');
const validatePkgName = require('validate-npm-package-name')
const inquirer = require('inquirer')
const stringUtils = require('lodash/string')
const isEmpty = require('lodash/isEmpty')

const SPECIAL_CHARACTERS = /[ `!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~]/g;
const COPY_OPTS = {
  processDestinationPath: (str) => path.format({
    _internal: path.parse(str),
    get root() { return this._internal.root },
    get dir() { return this._internal.dir },
    get base() { return this._internal.base.replace(/^_./, '.').replace(/.ejs$/, '') }
  }),
  globOptions: {
    // Allow patterns to match filenames starting with a period (files &
    // directories), even if the pattern does not explicitly have a period
    // in that spot.
    dot: true,
    // Disable expansion of brace patterns ({a,b}, {1..3}).
    nobrace: true,
    // Disable extglob support (patterns like +(a|b)), so that extglobs
    // are regarded as literal characters. This flag allows us to support
    // Windows paths such as
    // `D:\Users\BKU\oliverkarst\AppData(Roaming)\npm\node_modules\@loopback\cli`
    noext: true,
  },
}

module.exports = class extends Generator {
  async prompting() {
    this.answers = await this.prompt(
      [
        {
          type: 'input',
          name: 'name',
          message: 'Your API name',
          default: () => {
            const name = path.basename(path.resolve(this.env.cwd))
            return validatePkgName(name).validForNewPackages ? name : undefined
          },
          validate: (value) => {
            const {validForNewPackages: isValid, errors, warnings} = validatePkgName(value)
            if (errors || warnings) return (errors || warnings)[0]
            return isValid
          }
        },
        {
          type: 'input',
          name: 'description',
          message: 'Description'
        },
        {
          type: 'input',
          name: 'applicationClass',
          message: 'Application class',
          default: ({name}) => {
            const pascalName = stringUtils.upperFirst(
              stringUtils.camelCase(name.startsWith('@') ? name.split('/')[1] : name)
            )
            return `${pascalName}Application`
          },
          validate: (value) => {
            if (isEmpty(value)) return 'classname length must be greater than zero';
            if (/^\d/.test(value)) return 'classname must not start with a number';
            if (/\s/g.test(value)) return 'classname must not contain spaces';
            if (SPECIAL_CHARACTERS.test(value)) {
              const matches = value.match(SPECIAL_CHARACTERS)
              return `classname must not contain special characters (${matches.join(', ')})`;
            }
            return value !== stringUtils.upperFirst(stringUtils.camelCase(value))
              ? 'classname must be in PascalCase format'
              : true
          }
        },
        {
          type: 'checkbox',
          name: 'features',
          message: 'Select features',
          choices: [
            {
              short: 'Enable build',
              get name() {
                return `${this.short}: use @loopback/build helpers (e.g. lb-tsc)`
              },
              value: 'build',
              checked: true
            },
            {
              short: 'Enable repositories',
              get name() {
                return `${this.short}: include repository imports and RepositoryMixin`
              },
              value: 'repositories',
              checked: true
            },
            {
              short: 'Enable services',
              get name() {
                return `${this.short}: include service-proxy imports and ServiceMixin`
              },
              value: 'services',
              checked: true
            },
            new inquirer.Separator('── Third Party Features ──'),
            {
              short: 'Enable eslint',
              get name() {
                return `${this.short}: add a linter with pre-configured lint rules`
              },
              value: 'eslint',
            },
            {
              short: 'Enable prettier',
              get name() {
                return `${this.short}: install prettier to format code conforming to rules`
              },
              value: 'prettier',
            },
            {
              short: 'Enable mocha',
              get name() {
                return `${this.short}: install mocha to run tests`
              },
              value: 'mocha',
            },
            {
              short: 'Enable docker',
              get name() {
                return `${this.short}: include Dockerfile and .dockerignore`
              },
              value: 'docker',
            },
            {
              short: 'Enable vscode',
              get name() {
                return `${this.short}: add VSCode config files`
              },
              value: 'vscode',
            },
          ],
          loop: false
        }
      ])
  }

  configuring() {
    this.sourceRoot(path.join(__dirname, 'templates'));
  }

  writing() {
    this.fs.copyTpl(
      this.templatePath('_common/**/*'),
      this.destinationPath(),
      {
        name: this.answers.name,
        description: this.answers.description,
        projectType: 'application',
        private: true,
        author: this.user.git.email()
          ? {
            name: this.user.git.name(),
            email: this.user.git.email(),
          }
          : null,
        dependencies: {},
        features: this.answers.features,
      },
      undefined,
      COPY_OPTS,
    )

    this.fs.copyTpl(
      this.templatePath('app/**/*'),
      this.destinationPath(),
      {
        name: this.answers.name,
        applicationClass: this.answers.applicationClass,
        appClassWithMixins: null, // ToDo: customize appClassWithMixins
        features: this.answers.features
      },
      undefined,
      COPY_OPTS,
    )

    if (!this.answers.features.includes('eslint')) {
      this.deleteDestination('.eslintrc.*.ejs')
      this.deleteDestination('.eslintignore')
    }

    if (!this.answers.features.includes('prettier')) {
      this.deleteDestination('.prettier*')
    }

    // if (!this.answers.features.includes('build')) {
    //   this.moveDestination('package.plain.json', 'package.json')
    // } else {
    //   this.deleteDestination('package.plain.json.ejs')
    // }

    if (!this.answers.features.includes('mocha')) {
      this.deleteDestination('.mocharc.json')
    }

    if (!this.answers.features.includes('vscode')) {
      this.deleteDestination('.vscode')
    }

    // if (!this.answers.features.includes('yarn')) {
    //   this.deleteDestination('.npmrc')
    // }

    if (!this.answers.features.includes('docker')) {
      this.deleteDestination('Dockerfile')
      this.deleteDestination('.dockerignore')
    }

    if (!this.answers.features.includes('repositories')) {
      this.deleteDestination('src/migrate.ts.ejs')
    }
  }

  end() {
    this.debug(
      'Application %s was created in %s.',
      this.answers.name,
      this.env.cwd,
    );
  }
};
