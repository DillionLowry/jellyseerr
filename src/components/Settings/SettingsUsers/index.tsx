import Button from '@app/components/Common/Button';
import LabeledCheckbox from '@app/components/Common/LabeledCheckbox';
import LoadingSpinner from '@app/components/Common/LoadingSpinner';
import PageTitle from '@app/components/Common/PageTitle';
import PermissionEdit from '@app/components/PermissionEdit';
import QuotaSelector from '@app/components/QuotaSelector';
import useSettings from '@app/hooks/useSettings';
import globalMessages from '@app/i18n/globalMessages';
import defineMessages from '@app/utils/defineMessages';
import { ArrowDownOnSquareIcon } from '@heroicons/react/24/outline';
import { MediaServerType } from '@server/constants/server';
import type { MainSettings } from '@server/lib/settings';
import { Field, Form, Formik } from 'formik';
import { useIntl } from 'react-intl';
import { useToasts } from 'react-toast-notifications';
import useSWR, { mutate } from 'swr';
import * as yup from 'yup';
import { movieCertifications, tvCertifications } from '@server/models/certifications';

const messages = defineMessages('components.Settings.SettingsUsers', {
  users: 'Users',
  userSettings: 'User Settings',
  userSettingsDescription: 'Configure global and default user settings.',
  toastSettingsSuccess: 'User settings saved successfully!',
  toastSettingsFailure: 'Something went wrong while saving settings.',
  loginMethods: 'Login Methods',
  loginMethodsTip: 'Configure login methods for users.',
  localLogin: 'Enable Local Sign-In',
  localLoginTip: 'Allow users to sign in using their email address and password',
  mediaServerLogin: 'Enable {mediaServerName} Sign-In',
  mediaServerLoginTip: 'Allow users to sign in using their {mediaServerName} account',
  atLeastOneAuth: 'At least one authentication method must be selected.',
  newPlexLogin: 'Enable New {mediaServerName} Sign-In',
  newPlexLoginTip: 'Allow {mediaServerName} users to sign in without first being imported',
  movieRequestLimitLabel: 'Global Movie Request Limit',
  tvRequestLimitLabel: 'Global Series Request Limit',
  defaultPermissions: 'Default Permissions',
  defaultPermissionsTip: 'Initial permissions assigned to new users',
  contentRestrictions: 'Content Restrictions',
  contentRestrictionsTip: 'Configure default content rating restrictions',
  enableDefaultRestrictions: 'Enable Default Content Restrictions',
  enableDefaultRestrictionsTip: 'When enabled, new users will have content restriction settings applied',
  defaultAllowedMovieCertifications: 'Default Allowed Movie Ratings',
  defaultAllowedMovieCertificationsDescription: 'Select which movie ratings are allowed by default',
  defaultAllowedTvCertifications: 'Default Allowed TV Ratings',
  defaultAllowedTvCertificationsDescription: 'Select which TV ratings are allowed by default',
  certificationsSelectAll: 'Select All',
  certificationsSelectNone: 'Select None',
});

const SettingsUsers = () => {
  const { addToast } = useToasts();
  const intl = useIntl();
  const {
    data,
    error,
    mutate: revalidate,
  } = useSWR<MainSettings>('/api/v1/settings/main');
  const settings = useSettings();

  const schema = yup
    .object()
    .shape({
      localLogin: yup.boolean(),
      mediaServerLogin: yup.boolean(),
    })
    .test({
      name: 'atLeastOneAuth',
      test: function (values) {
        const isValid = ['localLogin', 'mediaServerLogin'].some(
          (field) => !!values[field]
        );

        if (isValid) return true;
        return this.createError({
          path: 'localLogin | mediaServerLogin',
          message: intl.formatMessage(messages.atLeastOneAuth),
        });
      },
    });

  if (!data && !error) {
    return <LoadingSpinner />;
  }

  const mediaServerFormatValues = {
    mediaServerName:
      settings.currentSettings.mediaServerType === MediaServerType.JELLYFIN
        ? 'Jellyfin'
        : settings.currentSettings.mediaServerType === MediaServerType.EMBY
        ? 'Emby'
        : settings.currentSettings.mediaServerType === MediaServerType.PLEX
        ? 'Plex'
        : undefined,
  };

  const parseAllowedMovieCertifications = () => {
    return data?.defaultAllowedMovieCertifications ?? [];
  };

  const parseAllowedTvCertifications = () => {
    return data?.defaultAllowedTvCertifications ?? [];
    }
  

  return (
    <>
      <PageTitle
        title={[
          intl.formatMessage(messages.users),
          intl.formatMessage(globalMessages.settings),
        ]}
      />
      <div className="mb-6">
        <h3 className="heading">{intl.formatMessage(messages.userSettings)}</h3>
        <p className="description">
          {intl.formatMessage(messages.userSettingsDescription)}
        </p>
      </div>
      <div className="section">
        <Formik
          initialValues={{
            localLogin: data?.localLogin,
            mediaServerLogin: data?.mediaServerLogin,
            newPlexLogin: data?.newPlexLogin,
            movieQuotaLimit: data?.defaultQuotas.movie.quotaLimit ?? 0,
            movieQuotaDays: data?.defaultQuotas.movie.quotaDays ?? 7,
            tvQuotaLimit: data?.defaultQuotas.tv.quotaLimit ?? 0,
            tvQuotaDays: data?.defaultQuotas.tv.quotaDays ?? 7,
            defaultPermissions: data?.defaultPermissions ?? 0,
            enableDefaultRestrictions: data?.enableDefaultRestrictions ?? false,
            defaultAllowedMovieCertifications: parseAllowedMovieCertifications(),
            defaultAllowedTvCertifications: parseAllowedTvCertifications(),
          }}
          validationSchema={schema}
          enableReinitialize
          onSubmit={async (values) => {
            console.log('Submitting form values:', {
              allowedMovieCertifications: values.defaultAllowedMovieCertifications,
              allowedTvCertifications: values.defaultAllowedMovieCertifications,
            });

            try {
              const res = await fetch('/api/v1/settings/main', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  localLogin: values.localLogin,
                  mediaServerLogin: values.mediaServerLogin,
                  newPlexLogin: values.newPlexLogin,
                  defaultQuotas: {
                    movie: {
                      quotaLimit: values.movieQuotaLimit,
                      quotaDays: values.movieQuotaDays,
                    },
                    tv: {
                      quotaLimit: values.tvQuotaLimit,
                      quotaDays: values.tvQuotaDays,
                    },
                  },
                  defaultPermissions: values.defaultPermissions,
                  enableDefaultRestrictions: values.enableDefaultRestrictions,
                  allowedMovieCertifications: values.enableDefaultRestrictions
                    ? values.defaultAllowedMovieCertifications
                    : [],
                  allowedTvCertifications: values.enableDefaultRestrictions
                    ? values.defaultAllowedTvCertifications
                    : [],
                }),
              });
              if (!res.ok) throw new Error();
              mutate('/api/v1/settings/public');

              addToast(intl.formatMessage(messages.toastSettingsSuccess), {
                autoDismiss: true,
                appearance: 'success',
              });
            } catch (e) {
              addToast(intl.formatMessage(messages.toastSettingsFailure), {
                autoDismiss: true,
                appearance: 'error',
              });
            } finally {
              revalidate();
            }
          }}
        >
          {({ isSubmitting, isValid, values, errors, setFieldValue }) => {
            return (
            <Form className="section">
              <div
                role="group"
                aria-labelledby="group-label"
                className="form-group"
              >
                <div className="form-row">
                  <span id="group-label" className="group-label">
                    {intl.formatMessage(messages.loginMethods)}
                    <span className="label-tip">
                      {intl.formatMessage(messages.loginMethodsTip)}
                    </span>
                    {'localLogin | mediaServerLogin' in errors && (
                      <span className="error">
                        {errors['localLogin | mediaServerLogin'] as string}
                      </span>
                    )}
                  </span>

                  <div className="form-input-area max-w-lg">
                    <LabeledCheckbox
                      id="localLogin"
                      label={intl.formatMessage(messages.localLogin)}
                      description={intl.formatMessage(
                        messages.localLoginTip,
                        mediaServerFormatValues
                      )}
                      onChange={() =>
                        setFieldValue('localLogin', !values.localLogin)
                      }
                    />
                    <LabeledCheckbox
                      id="mediaServerLogin"
                      className="mt-4"
                      label={intl.formatMessage(
                        messages.mediaServerLogin,
                        mediaServerFormatValues
                      )}
                      description={intl.formatMessage(
                        messages.mediaServerLoginTip,
                        mediaServerFormatValues
                      )}
                      onChange={() =>
                        setFieldValue(
                          'mediaServerLogin',
                          !values.mediaServerLogin
                        )
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="form-row">
                <label htmlFor="newPlexLogin" className="checkbox-label">
                  {intl.formatMessage(
                    messages.newPlexLogin,
                    mediaServerFormatValues
                  )}
                  <span className="label-tip">
                    {intl.formatMessage(
                      messages.newPlexLoginTip,
                      mediaServerFormatValues
                    )}
                  </span>
                </label>
                <div className="form-input-area">
                  <Field
                    type="checkbox"
                    id="newPlexLogin"
                    name="newPlexLogin"
                    onChange={() => {
                      setFieldValue('newPlexLogin', !values.newPlexLogin);
                    }}
                  />
                </div>
              </div>
              <div className="form-row">
                <label htmlFor="applicationTitle" className="text-label">
                  {intl.formatMessage(messages.movieRequestLimitLabel)}
                </label>
                <div className="form-input-area">
                  <QuotaSelector
                    onChange={setFieldValue}
                    dayFieldName="movieQuotaDays"
                    limitFieldName="movieQuotaLimit"
                    mediaType="movie"
                    defaultDays={values.movieQuotaDays}
                    defaultLimit={values.movieQuotaLimit}
                  />
                </div>
              </div>
              <div className="form-row">
                <label htmlFor="applicationTitle" className="text-label">
                  {intl.formatMessage(messages.tvRequestLimitLabel)}
                </label>
                <div className="form-input-area">
                  <QuotaSelector
                    onChange={setFieldValue}
                    dayFieldName="tvQuotaDays"
                    limitFieldName="tvQuotaLimit"
                    mediaType="tv"
                    defaultDays={values.tvQuotaDays}
                    defaultLimit={values.tvQuotaLimit}
                  />
                </div>
              </div>
              <div
                role="group"
                aria-labelledby="content-restrictions-label"
                className="form-group"
              >
                <div className="form-row">
                  <span id="content-restrictions-label" className="group-label">
                    {intl.formatMessage(messages.contentRestrictions)}
                    <span className="label-tip">
                      {intl.formatMessage(messages.contentRestrictionsTip)}
                    </span>
                  </span>
                  <div className="form-input-area max-w-lg">
                    <LabeledCheckbox
                      id="enableDefaultRestrictions"
                      className="enableDefaultRestrictions"
                      label={intl.formatMessage(messages.enableDefaultRestrictions)}
                      description={intl.formatMessage(
                        messages.enableDefaultRestrictionsTip
                      )}
                      onChange={() =>
                        setFieldValue('enableDefaultRestrictions', !values.enableDefaultRestrictions)
                      }
                    />

                    {values.enableDefaultRestrictions && (
                      <div className="mt-6 space-y-6">
                        {/* Movie Certifications */}
                        <div>
                          <label className="text-label block mb-2">
                            {intl.formatMessage(messages.defaultAllowedMovieCertifications)}
                            <span className="label-tip block">
                              {intl.formatMessage(messages.defaultAllowedMovieCertificationsDescription)}
                            </span>
                          </label>
                          <div className="mb-2 flex space-x-4">
                            <button
                              type="button"
                              className="text-sm text-gray-400 hover:text-white"
                              onClick={() => {
                                setFieldValue(
                                  'defaultAllowedMovieCertifications',
                                  movieCertifications.map(cert => cert.certification)
                                );
                              }}
                            >
                              {intl.formatMessage(messages.certificationsSelectAll)}
                            </button>
                            <button
                              type="button"
                              className="text-sm text-gray-400 hover:text-white"
                              onClick={() => {
                                setFieldValue('defaultAllowedMovieCertifications', []);
                              }}
                            >
                              {intl.formatMessage(messages.certificationsSelectNone)}
                            </button>
                          </div>
                          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                            {movieCertifications.map((cert) => (
                              <div key={cert.certification} className="flex items-center">
                                <input
                                  type="checkbox"
                                  id={`default-movie-cert-${cert.certification}`}
                                  checked={(values.defaultAllowedMovieCertifications as string[]).includes(cert.certification)}
                                  onChange={() => {
                                    const currentCerts = values.defaultAllowedMovieCertifications as string[];
                                    const newCerts = currentCerts.includes(cert.certification)
                                      ? currentCerts.filter((c: string) => c !== cert.certification)
                                      : [...currentCerts, cert.certification];
                                    setFieldValue('defaultAllowedMovieCertifications', newCerts);
                                  }}
                                  className="h-4 w-4 rounded border-gray-700 bg-gray-900 text-indigo-600 focus:ring-indigo-500"
                                />
                                <label htmlFor={`default-movie-cert-${cert.certification}`} className="ml-2 block text-sm text-gray-100">
                                  <span className="font-medium">{cert.certification}</span> - {cert.meaning}
                                </label>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* TV Certifications */}
                        <div>
                          <label className="text-label block mb-2">
                            {intl.formatMessage(messages.defaultAllowedTvCertifications)}
                            <span className="label-tip block">
                              {intl.formatMessage(messages.defaultAllowedTvCertificationsDescription)}
                            </span>
                          </label>
                          <div className="mb-2 flex space-x-4">
                            <button
                              type="button"
                              className="text-sm text-gray-400 hover:text-white"
                              onClick={() => {
                                setFieldValue(
                                  'defaultAllowedTvCertifications',
                                  tvCertifications.map(cert => cert.certification)
                                );
                              }}
                            >
                              {intl.formatMessage(messages.certificationsSelectAll)}
                            </button>
                            <button
                              type="button"
                              className="text-sm text-gray-400 hover:text-white"
                              onClick={() => {
                                setFieldValue('defaultAllowedTvCertifications', []);
                              }}
                            >
                              {intl.formatMessage(messages.certificationsSelectNone)}
                            </button>
                          </div>
                          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                            {tvCertifications.map((cert) => (
                              <div key={cert.certification} className="flex items-center">
                                <input
                                  type="checkbox"
                                  id={`default-tv-cert-${cert.certification}`}
                                  checked={values.defaultAllowedTvCertifications.includes(cert.certification)}
                                  onChange={() => {
                                    const currentCerts = values.defaultAllowedTvCertifications as string[];
                                    const newCerts = currentCerts.includes(cert.certification)
                                      ? currentCerts.filter((c: string) => c !== cert.certification)
                                      : [...currentCerts, cert.certification];
                                    setFieldValue('defaultAllowedTvCertifications', newCerts);
                                  }}
                                  className="h-4 w-4 rounded border-gray-700 bg-gray-900 text-indigo-600 focus:ring-indigo-500"
                                />
                                <label htmlFor={`default-tv-cert-${cert.certification}`} className="ml-2 block text-sm text-gray-100">
                                  <span className="font-medium">{cert.certification}</span> - {cert.meaning}
                                </label>
                              </div>
                            ))}
                          </div>
                        </div>
                        </div>
                    )}
                  </div>
                </div>
              </div>
              <div
                role="group"
                aria-labelledby="group-label"
                className="form-group"
              >
                <div className="form-row">
                  <span id="group-label" className="group-label">
                    {intl.formatMessage(messages.defaultPermissions)}
                    <span className="label-tip">
                      {intl.formatMessage(messages.defaultPermissionsTip)}
                    </span>
                  </span>
                  <div className="form-input-area">
                    <div className="max-w-lg">
                      <PermissionEdit
                        currentPermission={values.defaultPermissions}
                        onUpdate={(newPermissions) =>
                          setFieldValue('defaultPermissions', newPermissions)
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="actions">
                <div className="flex justify-end">
                  <span className="ml-3 inline-flex rounded-md shadow-sm">
                    <Button
                      buttonType="primary"
                      type="submit"
                      disabled={isSubmitting || !isValid}
                    >
                      <ArrowDownOnSquareIcon />
                      <span>
                        {isSubmitting
                          ? intl.formatMessage(globalMessages.saving)
                          : intl.formatMessage(globalMessages.save)}
                      </span>
                    </Button>
                  </span>
                </div>
              </div>
            </Form>
            );
          }}
        </Formik>
      </div>
    </>
  );
};

export default SettingsUsers;
