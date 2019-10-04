import _ from 'lodash'
import util from 'util'
import TransformLookupBuilder from './parameter_type_registry_builder'
import {
  buildParameterType,
  buildStepDefinitionConfig,
  buildStepDefinitionFromConfig,
  buildTestCaseHookDefinition,
  buildTestRunHookDefinition,
  IStepDefinitionConfig,
} from './build_helpers'
import { wrapDefinitions } from './finalize_helpers'
import StepDefinition from '../models/step_definition'
import TestCaseHookDefinition from '../models/test_case_hook_definition'
import TestRunHookDefinition from '../models/test_run_hook_definition'
import { ParameterTypeRegistry } from 'cucumber-expressions'

export type DefineStepPattern = string | RegExp

export interface IDefineStepOptions {
  timeout?: number;
  wrapperOptions?: any;
}

export interface IDefineTestCaseHookOptions {
  tags?: string;
  timeout?: number;
}

export interface IDefineTestRunHookOptions {
  timeout?: number;
}

export interface IDefineSupportCodeMethods {
  defineParameterType(options: any): void;
  defineStep(pattern: DefineStepPattern, code: any): void;
  defineStep(pattern: DefineStepPattern, options: IDefineStepOptions, code: any): void;
  setDefaultTimeout(milliseconds: number): void;
  setDefinitionFunctionWrapper(fn: any): void;
  setWorldConstructor(fn: any): void;
  After(code: any): void;
  After(tags: string, code: any): void;
  After(options: IDefineTestCaseHookOptions, code: any): void;
  AfterAll(code: any): void;
  AfterAll(options: IDefineTestRunHookOptions, code: any): void;
  Before(code: any): void;
  Before(tags: string, code: any): void;
  Before(options: IDefineTestCaseHookOptions, code: any): void;
  BeforeAll(code: any): void;
  BeforeAll(options: IDefineTestRunHookOptions, code: any): void;
  Given(pattern: DefineStepPattern, code: any): void;
  Given(pattern: DefineStepPattern, options: IDefineStepOptions, code: any): void;
  Then(pattern: DefineStepPattern, code: any): void;
  Then(pattern: DefineStepPattern, options: IDefineStepOptions, code: any): void;
  When(pattern: DefineStepPattern, code: any): void;
  When(pattern: DefineStepPattern, options: IDefineStepOptions, code: any): void;
}

export interface ISupportCodeLibrary {
  afterTestCaseHookDefinitions: TestCaseHookDefinition[],
  afterTestRunHookDefinitions: TestRunHookDefinition[],
  beforeTestCaseHookDefinitions: TestCaseHookDefinition[],
  beforeTestRunHookDefinitions: TestRunHookDefinition[],
  defaultTimeout: number,
  stepDefinitions: StepDefinition[],
  parameterTypeRegistry: ParameterTypeRegistry,
  World: any,
}

export class SupportCodeLibraryBuilder {
  public methods: IDefineSupportCodeMethods;
  private cwd: string;
  private options: ISupportCodeLibrary;
  private definitionFunctionWrapper: any;
  private stepDefinitionConfigs: IStepDefinitionConfig[];

  constructor() {
    this.methods = {
      defineParameterType: this.defineParameterType.bind(this),
      After: this.defineTestCaseHook('afterTestCaseHookDefinitions'),
      AfterAll: this.defineTestRunHook('afterTestRunHookDefinitions'),
      Before: this.defineTestCaseHook('beforeTestCaseHookDefinitions'),
      BeforeAll: this.defineTestRunHook('beforeTestRunHookDefinitions'),
      defineStep: this.defineStep.bind(this),
      setDefaultTimeout: milliseconds => {
        this.options.defaultTimeout = milliseconds
      },
      setDefinitionFunctionWrapper: fn => {
        this.definitionFunctionWrapper = fn
      },
      setWorldConstructor: fn => {
        this.options.World = fn
      },
    }
    this.methods.Given = this.methods.When = this.methods.Then = this.methods.defineStep
  }

  defineParameterType(options) {
    const parameterType = buildParameterType(options)
    this.options.parameterTypeRegistry.defineParameterType(parameterType)
  }

  defineStep(pattern, options, code) {
    const stepDefinitionConfig = buildStepDefinitionConfig({
      pattern,
      options,
      code,
      cwd: this.cwd,
    })
    this.stepDefinitionConfigs.push(stepDefinitionConfig)
  }

  defineTestCaseHook(collectionName) {
    return (options, code) => {
      const hookDefinition = buildTestCaseHookDefinition({
        options,
        code,
        cwd: this.cwd,
      })
      this.options[collectionName].push(hookDefinition)
    }
  }

  defineTestRunHook(collectionName) {
    return (options: IDefineTestRunHookOptions, code) => {
      const hookDefinition = buildTestRunHookDefinition({
        options,
        code,
        cwd: this.cwd,
      })
      this.options[collectionName].push(hookDefinition)
    }
  }

  finalize() {
    this.options.stepDefinitions = this.stepDefinitionConfigs.map(
      config =>
        buildStepDefinitionFromConfig({
          config,
          parameterTypeRegistry: this.options.parameterTypeRegistry,
        })
    )
    wrapDefinitions({
      cwd: this.cwd,
      definitionFunctionWrapper: this.definitionFunctionWrapper,
      definitions: _.chain([
        'afterTestCaseHook',
        'afterTestRunHook',
        'beforeTestCaseHook',
        'beforeTestRunHook',
        'step',
      ])
        .map(key => this.options[`${key}Definitions`])
        .flatten()
        .value(),
    })
    this.options.afterTestCaseHookDefinitions.reverse()
    this.options.afterTestRunHookDefinitions.reverse()
    return this.options
  }

  reset(cwd) {
    this.cwd = cwd
    this.definitionFunctionWrapper = null;
    this.stepDefinitionConfigs = [];
    this.options = _.cloneDeep({
      afterTestCaseHookDefinitions: [],
      afterTestRunHookDefinitions: [],
      beforeTestCaseHookDefinitions: [],
      beforeTestRunHookDefinitions: [],
      defaultTimeout: 5000,
      parameterTypeRegistry: TransformLookupBuilder.build(),
      World({ attach, parameters }) {
        this.attach = attach
        this.parameters = parameters
      },
    })
  }
}

export default new SupportCodeLibraryBuilder()
