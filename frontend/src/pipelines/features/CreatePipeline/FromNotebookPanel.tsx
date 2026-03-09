import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import Button from "core/components/Button";
import Field from "core/components/forms/Field";
import Select from "core/components/forms/Select";
import useForm from "core/hooks/useForm";
import { BucketObject, BucketObjectType, PipelineFunctionalType } from "graphql/types";
import { useTranslation } from "next-i18next";
import { useRouter } from "next/router";
import { useCreatePipelineMutation } from "workspaces/graphql/mutations.generated";
import BucketObjectPicker from "workspaces/features/BucketObjectPicker";
import { formatPipelineFunctionalType } from "workspaces/helpers/pipelines";
import { WorkspaceLayout_WorkspaceFragment } from "workspaces/layouts/WorkspaceLayout/WorkspaceLayout.generated";

type Props = {
  workspace: WorkspaceLayout_WorkspaceFragment;
  onBack: () => void;
};

const FromNotebookPanel = ({ workspace, onBack }: Props) => {
  const { t } = useTranslation();
  const router = useRouter();
  const [mutate] = useCreatePipelineMutation();

  const form = useForm<{
    name: string;
    functionalType: PipelineFunctionalType | null;
    notebookObject: BucketObject | null;
  }>({
    onSubmit: async (values) => {
      const { data } = await mutate({
        variables: {
          input: {
            name: values.name,
            notebookPath: values.notebookObject!.key,
            workspaceSlug: workspace.slug,
            functionalType: values.functionalType,
          },
        },
      });

      if (data?.createPipeline.success && data.createPipeline.pipeline) {
        const pipeline = data.createPipeline.pipeline;
        await router.push(
          `/workspaces/${encodeURIComponent(workspace.slug)}/pipelines/${encodeURIComponent(pipeline.code)}`,
        );
      } else {
        throw new Error(t("An error occurred while creating the pipeline."));
      }
    },
    validate(values) {
      const errors: Partial<Record<"notebookObject" | "name" | "functionalType", string>> = {};
      if (!values.notebookObject) {
        errors.notebookObject = t("You have to select a notebook");
      }
      return errors as Record<"notebookObject" | "name" | "functionalType", string>;
    },
  });

  return (
    <div className="space-y-4">
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        {t("Back")}
      </button>
      <h2 className="text-lg font-medium">{t("Create from Notebook")}</h2>
      <p className="mb-6">
        {t(
          "You can use a Notebook from the workspace file system to be run as a pipeline. This is the easiest way to create a pipeline. Keep in my mind that Notebooks are not versioned. If a user changes the notebook, the pipeline will be updated.",
        )}
      </p>
      <form onSubmit={form.handleSubmit}>
        <div className="grid gap-6">
          <Field
            name="name"
            label={t("Pipeline Name")}
            required
            placeholder={t("My Pipeline")}
            error={form.touched.name && form.errors.name}
            value={form.formData.name}
            onChange={form.handleInputChange}
          />
          <Field
            name="functionalType"
            label={t("Functional Type")}
            help={t("The functional purpose of this pipeline")}
            className="max-w-xs"
          >
            <Select
              options={Object.values(PipelineFunctionalType)}
              value={form.formData.functionalType}
              onChange={(value) => form.setFieldValue("functionalType", value)}
              getOptionLabel={(option) =>
                option ? formatPipelineFunctionalType(option) : t("Not specified")
              }
              displayValue={(option) =>
                option ? formatPipelineFunctionalType(option) : ""
              }
              placeholder={t("Select functional type (optional)")}
              className="max-w-xs"
            />
          </Field>
          <Field
            name="notebookObject"
            label={t("Notebook")}
            required
            error={form.touched.notebookObject && form.errors.notebookObject}
            className="max-w-[230px]"
          >
            <BucketObjectPicker
              onChange={(value) => form.setFieldValue("notebookObject", value)}
              value={form.formData.notebookObject?.key ?? null}
              exclude={(item) =>
                item.type === BucketObjectType.File &&
                !item.name.endsWith(".ipynb")
              }
              placeholder={t("Select a Jupyter notebook")}
              workspace={workspace}
            />
          </Field>
          {form.submitError && (
            <p className="text-sm text-red-500">{form.submitError}</p>
          )}
        </div>
        <div className="mt-6 flex justify-end">
          <Button type="submit" disabled={form.isSubmitting}>
            {t("Create Pipeline")}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default FromNotebookPanel;
